const pool = require('../db');

const splitSearchTokens = (input) =>
  String(input || '')
    .toLowerCase()
    .split(/[\s,.;:()\-_/]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 8);

const escapeLikeToken = (value) => value.replace(/[\\%_]/g, '\\$&');

const getGerenteLinea = async (idUsuario) => {
  const result = await pool.query(
    'SELECT id_linea FROM gerente_linea WHERE id_usuario = $1 LIMIT 1',
    [idUsuario]
  );

  return result.rows[0] || null;
};

// Controlador para agregar una nueva ruta
const addRoute = async (req, res) => {
  const { nombre, descripcion } = req.body;

  // Validar que los campos requeridos estén presentes
  if (!nombre || !descripcion) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const gerenteLinea = await getGerenteLinea(req.user.id);
    if (!gerenteLinea) {
      return res.status(403).json({ error: 'No tienes una línea asignada para gestionar rutas' });
    }

    // Insertar la nueva ruta
    const nuevaRuta = await pool.query(
      'INSERT INTO ruta (id_linea, nombre, descripcion, created_at) VALUES ($1, $2, $3, now()) RETURNING *',
      [gerenteLinea.id_linea, nombre, descripcion]
    );

    res.status(201).json({ message: 'Ruta creada exitosamente', ruta: nuevaRuta.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la ruta' });
  }
};

const listRoutesByLine = async (req, res) => {
  try {
    const gerenteLinea = await getGerenteLinea(req.user.id);
    if (!gerenteLinea) {
      return res.status(403).json({ error: 'No tienes una línea asignada para ver rutas' });
    }

    const rutas = await pool.query(
      `SELECT id, id_linea, nombre, descripcion, created_at
       FROM ruta
       WHERE id_linea = $1
       ORDER BY id DESC`,
      [gerenteLinea.id_linea]
    );

    return res.status(200).json({
      message: 'Rutas obtenidas exitosamente',
      idLinea: gerenteLinea.id_linea,
      rutas: rutas.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al listar rutas' });
  }
};

const searchRoutes = async (req, res) => {
  const queryText = String(req.query.q || '').trim();
  const tokens = splitSearchTokens(queryText);

  if (tokens.length === 0) {
    return res.status(400).json({ error: 'Debes enviar un texto de búsqueda (parámetro q).' });
  }

  try {
    const whereClauses = tokens.map(
      (_, index) =>
        `(LOWER(COALESCE(r.nombre, '')) LIKE $${index + 1} ESCAPE '\\'
          OR LOWER(COALESCE(r.descripcion, '')) LIKE $${index + 1} ESCAPE '\\'
          OR LOWER(COALESCE(l.nombre, '')) LIKE $${index + 1} ESCAPE '\\')`
    );

    const params = tokens.map((token) => `%${escapeLikeToken(token)}%`);

    const rutas = await pool.query(
      `SELECT
         r.id,
         r.id_linea,
         l.nombre AS linea_nombre,
         r.nombre,
         r.descripcion,
         r.created_at
       FROM ruta r
       INNER JOIN linea l ON l.id = r.id_linea
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY r.id DESC
       LIMIT 50`,
      params
    );

    return res.status(200).json({
      message: 'Búsqueda de rutas completada',
      query: queryText,
      tokens,
      total: rutas.rows.length,
      rutas: rutas.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al buscar rutas' });
  }
};

// Controlador para editar una ruta
const editRoute = async (req, res) => {
  const { idRuta } = req.params;
  const { nombre, descripcion } = req.body;

  // Validar que los campos requeridos estén presentes
  if (!nombre || !descripcion) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Verificar si la ruta existe y pertenece a una línea del gerente
    const ruta = await pool.query(
      'SELECT * FROM ruta WHERE id = $1 AND id_linea IN (SELECT id_linea FROM gerente_linea WHERE id_usuario = $2)',
      [idRuta, req.user.id]
    );

    if (ruta.rows.length === 0) {
      return res.status(404).json({ error: 'Ruta no encontrada o no tienes permiso para editarla' });
    }

    // Actualizar la ruta
    const rutaActualizada = await pool.query(
      'UPDATE ruta SET nombre = $1, descripcion = $2, created_at = now() WHERE id = $3 RETURNING *',
      [nombre, descripcion, idRuta]
    );

    res.status(200).json({ message: 'Ruta actualizada exitosamente', ruta: rutaActualizada.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la ruta' });
  }
};

// Controlador para eliminar una ruta
const deleteRoute = async (req, res) => {
  const { idRuta } = req.params;

  try {
    // Verificar si la ruta existe y pertenece a una línea del gerente
    const ruta = await pool.query(
      'SELECT * FROM ruta WHERE id = $1 AND id_linea IN (SELECT id_linea FROM gerente_linea WHERE id_usuario = $2)',
      [idRuta, req.user.id]
    );

    if (ruta.rows.length === 0) {
      return res.status(404).json({ error: 'Ruta no encontrada o no tienes permiso para eliminarla' });
    }

    // Eliminar la ruta
    await pool.query('DELETE FROM ruta WHERE id = $1', [idRuta]);

    res.status(200).json({ message: 'Ruta eliminada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la ruta' });
  }
};

module.exports = { addRoute, listRoutesByLine, searchRoutes, editRoute, deleteRoute };