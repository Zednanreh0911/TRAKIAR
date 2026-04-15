const pool = require('../db');

const getGerenteLinea = async (idUsuario) => {
  const result = await pool.query(
    'SELECT id_linea FROM gerente_linea WHERE id_usuario = $1 LIMIT 1',
    [idUsuario]
  );
  return result.rows[0] || null;
};

const getUnitByManagerScope = async (idUnidad, idUsuarioGerente) => {
  const result = await pool.query(
    `SELECT u.*
     FROM unidad u
     WHERE u.id = $1
       AND u.id_linea IN (SELECT id_linea FROM gerente_linea WHERE id_usuario = $2)
     LIMIT 1`,
    [idUnidad, idUsuarioGerente]
  );

  return result.rows[0] || null;
};

const getDriverByEmail = async (correo) => {
  const result = await pool.query(
    `SELECT c.id, c.id_usuario, u.nombre, u.correo
     FROM chofer c
     INNER JOIN usuario u ON u.id = c.id_usuario
     WHERE u.correo = $1
     LIMIT 1`,
    [correo]
  );

  return result.rows[0] || null;
};

// Controlador para crear una unidad
const createUnit = async (req, res) => {
  const { identificador, estado = 'activo' } = req.body;

  if (!identificador || !String(identificador).trim()) {
    return res.status(400).json({ error: 'El identificador de la unidad es obligatorio' });
  }

  try {
    const gerenteLinea = await getGerenteLinea(req.user.id);
    if (!gerenteLinea) {
      return res.status(403).json({ error: 'No tienes una línea asignada para crear unidades' });
    }

    const unidadCreada = await pool.query(
      'INSERT INTO unidad (identificador, id_linea, estado) VALUES ($1, $2, $3) RETURNING *',
      [String(identificador).trim(), gerenteLinea.id_linea, estado]
    );

    res.status(201).json({ message: 'Unidad creada exitosamente', unidad: unidadCreada.rows[0] });
  } catch (error) {
    if (error.code === '22P02') {
      return res.status(400).json({ error: 'El estado de la unidad es inválido' });
    }

    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una unidad con ese identificador' });
    }

    console.error(error);
    res.status(500).json({ error: 'Error al crear la unidad' });
  }
};

const listUnitsByLine = async (req, res) => {
  try {
    const gerenteLinea = await getGerenteLinea(req.user.id);
    if (!gerenteLinea) {
      return res.status(403).json({ error: 'No tienes una línea asignada para ver unidades' });
    }

    const unidades = await pool.query(
      `SELECT
          un.id,
      un.identificador,
          un.id_linea,
          un.id_chofer,
          un.estado,
          un.created_at,
          un.modified_at,
          usr.nombre AS chofer_nombre,
          usr.correo AS chofer_correo
       FROM unidad un
       LEFT JOIN chofer ch ON ch.id = un.id_chofer
       LEFT JOIN usuario usr ON usr.id = ch.id_usuario
       WHERE un.id_linea = $1
       ORDER BY un.id DESC`,
      [gerenteLinea.id_linea]
    );

    res.status(200).json({
      message: 'Unidades obtenidas exitosamente',
      idLinea: gerenteLinea.id_linea,
      unidades: unidades.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener unidades por línea' });
  }
};

// Controlador para asignar unidades a choferes
const assignUnitToDriver = async (req, res) => {
  const { idUnidad, correo } = req.body;

  // Validar que los campos requeridos estén presentes
  if (!idUnidad || !correo) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const unidad = await getUnitByManagerScope(idUnidad, req.user.id);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada o no pertenece a tu línea' });
    }

    if (unidad.id_chofer !== null) {
      return res.status(400).json({ error: 'La unidad ya está asignada a otro chofer' });
    }

    const chofer = await getDriverByEmail(correo);
    if (!chofer) {
      return res.status(404).json({ error: 'No se encontró un chofer asociado a ese correo' });
    }

    const idChofer = chofer.id;

    const unidadChofer = await pool.query('SELECT id FROM unidad WHERE id_chofer = $1', [idChofer]);
    if (unidadChofer.rows.length > 0) {
      return res.status(400).json({ error: 'El chofer ya tiene una unidad asignada' });
    }

    // Asignar la unidad al chofer
    await pool.query('UPDATE unidad SET id_chofer = $1 WHERE id = $2', [idChofer, idUnidad]);

    res.status(200).json({ message: 'Unidad asignada al chofer exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al asignar la unidad al chofer' });
  }
};

const updateUnitDriver = async (req, res) => {
  const { idUnidad, correo } = req.body;

  if (!idUnidad || !correo) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const unidad = await getUnitByManagerScope(idUnidad, req.user.id);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada o no pertenece a tu línea' });
    }

    const chofer = await getDriverByEmail(correo);
    if (!chofer) {
      return res.status(404).json({ error: 'No se encontró un chofer asociado a ese correo' });
    }

    if (unidad.id_chofer === chofer.id) {
      return res.status(200).json({ message: 'La unidad ya está asignada a ese chofer' });
    }

    const unidadChofer = await pool.query('SELECT id FROM unidad WHERE id_chofer = $1 AND id <> $2', [chofer.id, idUnidad]);
    if (unidadChofer.rows.length > 0) {
      return res.status(400).json({ error: 'El chofer ya tiene una unidad asignada' });
    }

    await pool.query('UPDATE unidad SET id_chofer = $1 WHERE id = $2', [chofer.id, idUnidad]);

    return res.status(200).json({ message: 'Chofer de la unidad actualizado exitosamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al actualizar el chofer de la unidad' });
  }
};

const deleteUnit = async (req, res) => {
  const { idUnidad } = req.params;

  if (!idUnidad) {
    return res.status(400).json({ error: 'El id de unidad es obligatorio' });
  }

  try {
    const unidad = await getUnitByManagerScope(Number(idUnidad), req.user.id);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada o no pertenece a tu línea' });
    }

    await pool.query('DELETE FROM unidad WHERE id = $1', [idUnidad]);
    return res.status(200).json({ message: 'Unidad eliminada exitosamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al eliminar la unidad' });
  }
};

module.exports = { createUnit, listUnitsByLine, assignUnitToDriver, updateUnitDriver, deleteUnit };