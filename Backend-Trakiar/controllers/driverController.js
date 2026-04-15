const pool = require('../db');

const parseCapturedAt = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDriverUnitScope = async (idUsuario) => {
  const result = await pool.query(
    `SELECT
        c.id AS id_chofer,
        u.nombre,
        u.correo,
        un.id AS id_unidad,
        un.identificador AS unidad_identificador,
        un.estado AS unidad_estado,
        un.id_linea
     FROM usuario u
     INNER JOIN chofer c ON c.id_usuario = u.id
     LEFT JOIN unidad un ON un.id_chofer = c.id
     WHERE u.id = $1
     LIMIT 1`,
    [idUsuario]
  );

  return result.rows[0] || null;
};

// Controlador para promover usuarios a choferes
const promoteToDriver = async (req, res) => {
  const { correo, cedula } = req.body;

  // Validar que los campos requeridos estén presentes
  if (!correo || !cedula) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Verificar si el usuario existe y no es ya un chofer
    const usuario = await pool.query('SELECT * FROM usuario WHERE correo = $1', [correo]);
    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioEncontrado = usuario.rows[0];

    if (usuarioEncontrado.rol === 'gerente' || usuarioEncontrado.rol === 'admin') {
      return res.status(400).json({ error: 'No se puede promover a chofer un usuario gerente o admin' });
    }

    if (usuario.rows[0].rol === 'chofer') {
      return res.status(400).json({ error: 'El usuario ya es un chofer' });
    }

    // Actualizar el rol del usuario a chofer
    await pool.query('UPDATE usuario SET rol = $1 WHERE id = $2', ['chofer', usuarioEncontrado.id]);

    // Insertar el chofer en la tabla chofer
    const nuevoChofer = await pool.query(
      'INSERT INTO chofer (id_usuario, cedula) VALUES ($1, $2) RETURNING *',
      [usuarioEncontrado.id, cedula]
    );

    res.status(201).json({ message: 'Usuario promovido a chofer exitosamente', chofer: nuevoChofer.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al promover al usuario a chofer' });
  }
};

const getDriverProfile = async (req, res) => {
  try {
    const row = await getDriverUnitScope(req.user.id);

    if (!row) {
      return res.status(404).json({ error: 'Perfil de chofer no encontrado' });
    }

    return res.status(200).json({
      message: 'Perfil de chofer obtenido exitosamente',
      chofer: {
        idUsuario: req.user.id,
        idChofer: row.id_chofer,
        nombre: row.nombre,
        correo: row.correo,
      },
      unidad: row.id_unidad
        ? {
            id: row.id_unidad,
            identificador: row.unidad_identificador,
            estado: row.unidad_estado,
          }
        : null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener el perfil del chofer' });
  }
};

const getDriverRoutes = async (req, res) => {
  try {
    const scope = await getDriverUnitScope(req.user.id);
    if (!scope) {
      return res.status(404).json({ error: 'Perfil de chofer no encontrado' });
    }

    if (!scope.id_linea) {
      return res.status(200).json({
        message: 'El chofer no tiene unidad asignada, no hay rutas disponibles',
        rutas: [],
      });
    }

    const rutas = await pool.query(
      `SELECT id, id_linea, nombre, descripcion, created_at
       FROM ruta
       WHERE id_linea = $1
       ORDER BY id DESC`,
      [scope.id_linea]
    );

    return res.status(200).json({
      message: 'Rutas de chofer obtenidas exitosamente',
      idLinea: scope.id_linea,
      rutas: rutas.rows,
      unidad: {
        id: scope.id_unidad,
        identificador: scope.unidad_identificador,
        estado: scope.unidad_estado,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener rutas del chofer' });
  }
};

const registerDriverLocation = async (req, res) => {
  const { idRuta, latitud, longitud, velocidadKmh = null, capturedAt = null } = req.body;

  if (!idRuta || latitud === undefined || longitud === undefined) {
    return res.status(400).json({ error: 'Los campos idRuta, latitud y longitud son obligatorios' });
  }

  const capturedAtDate = parseCapturedAt(capturedAt);
  if (capturedAt && !capturedAtDate) {
    return res.status(400).json({ error: 'El campo capturedAt no tiene un formato de fecha válido' });
  }

  try {
    const scope = await getDriverUnitScope(req.user.id);
    if (!scope) {
      return res.status(404).json({ error: 'Perfil de chofer no encontrado' });
    }

    if (!scope.id_unidad || !scope.id_linea) {
      return res.status(400).json({ error: 'El chofer no tiene una unidad asignada para reportar ubicación' });
    }

    const ruta = await pool.query(
      'SELECT id FROM ruta WHERE id = $1 AND id_linea = $2 LIMIT 1',
      [idRuta, scope.id_linea]
    );

    if (ruta.rows.length === 0) {
      return res.status(404).json({ error: 'La ruta seleccionada no pertenece a la línea del chofer' });
    }

    const ubicacion = await pool.query(
      `INSERT INTO ubicacion (id_unidad, id_ruta, latitud, longitud, velocidad_kmh, created_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
       RETURNING id, id_unidad, id_ruta, latitud, longitud, velocidad_kmh, created_at`,
      [scope.id_unidad, idRuta, latitud, longitud, velocidadKmh, capturedAtDate]
    );

    return res.status(201).json({
      message: 'Ubicación registrada exitosamente',
      idRuta,
      ubicacion: ubicacion.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al registrar ubicación del chofer' });
  }
};

const registerDriverLocationsBatch = async (req, res) => {
  const { idRuta, puntos } = req.body;

  if (!idRuta || !Array.isArray(puntos) || puntos.length === 0) {
    return res.status(400).json({ error: 'Los campos idRuta y puntos[] (no vacío) son obligatorios' });
  }

  try {
    const scope = await getDriverUnitScope(req.user.id);
    if (!scope) {
      return res.status(404).json({ error: 'Perfil de chofer no encontrado' });
    }

    if (!scope.id_unidad || !scope.id_linea) {
      return res.status(400).json({ error: 'El chofer no tiene una unidad asignada para reportar ubicación' });
    }

    const ruta = await pool.query(
      'SELECT id FROM ruta WHERE id = $1 AND id_linea = $2 LIMIT 1',
      [idRuta, scope.id_linea]
    );

    if (ruta.rows.length === 0) {
      return res.status(404).json({ error: 'La ruta seleccionada no pertenece a la línea del chofer' });
    }

    const normalizedPoints = [];
    for (let index = 0; index < puntos.length; index += 1) {
      const point = puntos[index] || {};
      const latitud = Number(point.latitud);
      const longitud = Number(point.longitud);

      if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
        return res.status(400).json({
          error: `El punto en la posición ${index} no tiene latitud/longitud válidas`,
        });
      }

      const velocidadKmh = point.velocidadKmh == null ? null : Number(point.velocidadKmh);
      const capturedAtDate = parseCapturedAt(point.capturedAt);
      if (point.capturedAt && !capturedAtDate) {
        return res.status(400).json({
          error: `El punto en la posición ${index} tiene capturedAt inválido`,
        });
      }

      normalizedPoints.push({
        latitud,
        longitud,
        velocidadKmh: Number.isFinite(velocidadKmh) ? velocidadKmh : null,
        capturedAt: capturedAtDate,
      });
    }

    const values = [];
    const placeholders = normalizedPoints
      .map((point, index) => {
        const base = index * 6;
        values.push(scope.id_unidad, idRuta, point.latitud, point.longitud, point.velocidadKmh, point.capturedAt);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, COALESCE($${base + 6}, NOW()))`;
      })
      .join(', ');

    const insert = await pool.query(
      `INSERT INTO ubicacion (id_unidad, id_ruta, latitud, longitud, velocidad_kmh, created_at)
       VALUES ${placeholders}
       RETURNING id, id_unidad, id_ruta, latitud, longitud, velocidad_kmh, created_at`,
      values
    );

    return res.status(201).json({
      message: 'Ubicaciones registradas exitosamente',
      idRuta,
      totalRecibidos: puntos.length,
      totalInsertados: insert.rows.length,
      primeraUbicacion: insert.rows[0] || null,
      ultimaUbicacion: insert.rows[insert.rows.length - 1] || null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al registrar lote de ubicaciones del chofer' });
  }
};

module.exports = {
  promoteToDriver,
  getDriverProfile,
  getDriverRoutes,
  registerDriverLocation,
  registerDriverLocationsBatch,
};