const pool = require('../db');

const EARTH_RADIUS_METERS = 6371000;
const AUTO_ROUTE_MIN_POINTS_REQUIRED = 8;
const AUTO_ROUTE_MAX_POINTS = 60;
const AUTO_ROUTE_MIN_DISTANCE_METERS = 10;

const parseCapturedAt = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
};

const buildAutoRouteInterestPoints = (normalizedPoints) => {
  if (!Array.isArray(normalizedPoints) || normalizedPoints.length === 0) {
    return [];
  }

  const spaced = [];

  for (const point of normalizedPoints) {
    if (spaced.length === 0) {
      spaced.push(point);
      continue;
    }

    const last = spaced[spaced.length - 1];
    const distance = haversineDistanceMeters(last.latitud, last.longitud, point.latitud, point.longitud);

    if (distance >= AUTO_ROUTE_MIN_DISTANCE_METERS) {
      spaced.push(point);
    }
  }

  const lastRawPoint = normalizedPoints[normalizedPoints.length - 1];
  const lastSpacedPoint = spaced[spaced.length - 1];
  if (
    lastRawPoint &&
    lastSpacedPoint &&
    (Number(lastRawPoint.latitud) !== Number(lastSpacedPoint.latitud) ||
      Number(lastRawPoint.longitud) !== Number(lastSpacedPoint.longitud))
  ) {
    spaced.push(lastRawPoint);
  }

  if (spaced.length < AUTO_ROUTE_MIN_POINTS_REQUIRED) {
    return [];
  }

  let sampled = spaced;
  if (spaced.length > AUTO_ROUTE_MAX_POINTS) {
    const step = (spaced.length - 1) / (AUTO_ROUTE_MAX_POINTS - 1);
    sampled = Array.from({ length: AUTO_ROUTE_MAX_POINTS }, (_, index) => spaced[Math.round(index * step)]);
  }

  const deduped = sampled.filter((point, index) => {
    if (index === 0) {
      return true;
    }

    const prev = sampled[index - 1];
    return Number(prev.latitud) !== Number(point.latitud) || Number(prev.longitud) !== Number(point.longitud);
  });

  return deduped.map((point, index) => ({
    nombre: `Punto ${index + 1}`,
    orden: index + 1,
    latitud: point.latitud,
    longitud: point.longitud,
  }));
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

const demoteDriverToUser = async (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ error: 'El correo es obligatorio' });
  }

  let transactionStarted = false;

  try {
    const usuario = await pool.query('SELECT id, rol FROM usuario WHERE correo = $1', [correo]);
    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioEncontrado = usuario.rows[0];
    if (usuarioEncontrado.rol !== 'chofer') {
      return res.status(400).json({ error: 'El usuario no es chofer' });
    }

    await pool.query('BEGIN');
    transactionStarted = true;

    const chofer = await pool.query('SELECT id FROM chofer WHERE id_usuario = $1', [usuarioEncontrado.id]);

    if (chofer.rows.length > 0) {
      const idChofer = chofer.rows[0].id;
      await pool.query('UPDATE unidad SET id_chofer = NULL, modified_by = $2 WHERE id_chofer = $1', [idChofer, req.user.id]);
      await pool.query('DELETE FROM chofer WHERE id = $1', [idChofer]);
    }

    await pool.query('UPDATE usuario SET rol = $1 WHERE id = $2', ['pasajero', usuarioEncontrado.id]);

    await pool.query('COMMIT');

    return res.status(200).json({
      message: 'Chofer degradado a usuario exitosamente',
      usuarioId: usuarioEncontrado.id,
    });
  } catch (error) {
    if (transactionStarted) {
      await pool.query('ROLLBACK');
    }
    console.error(error);
    return res.status(500).json({ error: 'Error al degradar chofer a usuario' });
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

    let autoRouteConfiguration = {
      applied: false,
      reason: 'already_configured',
      totalPointsCreated: 0,
    };

    const existingInterestPoints = await pool.query(
      'SELECT COUNT(*)::int AS total FROM punto_interes WHERE id_ruta = $1',
      [idRuta]
    );

    const hasInterestPoints = Number(existingInterestPoints.rows[0]?.total || 0) > 0;

    if (!hasInterestPoints) {
      const autoInterestPoints = buildAutoRouteInterestPoints(normalizedPoints);

      if (autoInterestPoints.length > 0) {
        const pointValues = [];
        const pointPlaceholders = autoInterestPoints
          .map((point, index) => {
            const base = index * 5;
            pointValues.push(idRuta, point.nombre, point.orden, point.latitud, point.longitud);
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
          })
          .join(', ');

        const createdPoints = await pool.query(
          `INSERT INTO punto_interes (id_ruta, nombre, orden, latitud, longitud)
           VALUES ${pointPlaceholders}
           RETURNING id`,
          pointValues
        );

        autoRouteConfiguration = {
          applied: true,
          reason: 'first_pass_seeded_route',
          totalPointsCreated: createdPoints.rows.length,
        };
      } else {
        autoRouteConfiguration = {
          applied: false,
          reason: 'insufficient_points_for_auto_configuration',
          totalPointsCreated: 0,
          minimumRequired: AUTO_ROUTE_MIN_POINTS_REQUIRED,
        };
      }
    }

    return res.status(201).json({
      message: 'Ubicaciones registradas exitosamente',
      idRuta,
      totalRecibidos: puntos.length,
      totalInsertados: insert.rows.length,
      autoRouteConfiguration,
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
  demoteDriverToUser,
  getDriverProfile,
  getDriverRoutes,
  registerDriverLocation,
  registerDriverLocationsBatch,
};