const pool = require('../db');

const getGerenteLinea = async (idUsuario) => {
  const result = await pool.query(
    'SELECT id_linea FROM gerente_linea WHERE id_usuario = $1 LIMIT 1',
    [idUsuario]
  );
  return result.rows[0] || null;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getManagerStats = async (req, res) => {
  try {
    const gerenteLinea = await getGerenteLinea(req.user.id);
    if (!gerenteLinea) {
      return res.status(403).json({ error: 'No tienes una linea asignada para ver estadisticas' });
    }

    const [unitsResult, routesResult, etaResult] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE estado = 'activo') AS activos,
          COUNT(*) FILTER (WHERE estado = 'inactivo') AS inactivos,
          COUNT(*) FILTER (WHERE id_chofer IS NOT NULL) AS con_chofer
         FROM unidad
         WHERE id_linea = $1`,
        [gerenteLinea.id_linea]
      ),
      pool.query('SELECT COUNT(*) AS total FROM ruta WHERE id_linea = $1', [gerenteLinea.id_linea]),
      pool.query(
        `WITH recent AS (
           SELECT
             u.id AS id_unidad,
             MAX(ub.created_at) AS last_update,
             AVG(ub.velocidad_kmh) AS avg_speed
           FROM unidad u
           LEFT JOIN ubicacion ub
             ON ub.id_unidad = u.id
            AND ub.created_at > NOW() - INTERVAL '24 hours'
           WHERE u.id_linea = $1
           GROUP BY u.id
         )
         SELECT
           COUNT(*) FILTER (WHERE last_update IS NOT NULL) AS units_with_data,
           COUNT(*) FILTER (WHERE last_update >= NOW() - INTERVAL '5 minutes') AS units_recent,
           AVG(avg_speed) AS avg_speed
         FROM recent`,
        [gerenteLinea.id_linea]
      ),
    ]);

    const unitsRow = unitsResult.rows[0] || {};
    const routesRow = routesResult.rows[0] || {};
    const etaRow = etaResult.rows[0] || {};

    const totalUnits = toNumber(unitsRow.total);
    const activeUnits = toNumber(unitsRow.activos);
    const inactiveUnits = toNumber(unitsRow.inactivos);
    const assignedUnits = toNumber(unitsRow.con_chofer);
    const unassignedUnits = Math.max(0, totalUnits - assignedUnits);
    const assignedPct = totalUnits > 0 ? Math.round((assignedUnits / totalUnits) * 100) : 0;

    const routesTotal = toNumber(routesRow.total);
    const coveragePct = routesTotal > 0 ? Math.round(Math.min(1, activeUnits / routesTotal) * 100) : 0;

    const unitsWithData = toNumber(etaRow.units_with_data);
    const unitsRecent = toNumber(etaRow.units_recent);
    const avgSpeed = etaRow.avg_speed === null ? null : Number(etaRow.avg_speed);
    const recentPct = unitsWithData > 0 ? Math.round((unitsRecent / unitsWithData) * 100) : null;

    return res.status(200).json({
      message: 'Estadisticas operativas obtenidas',
      units: {
        total: totalUnits,
        active: activeUnits,
        inactive: inactiveUnits,
      },
      drivers: {
        assigned: assignedUnits,
        unassigned: unassignedUnits,
        assignedPct,
      },
      routes: {
        total: routesTotal,
      },
      coverage: {
        routesTotal,
        activeUnits,
        coveragePct,
      },
      etaQuality: {
        recentPct,
        avgSpeedKmh: avgSpeed === null ? null : Number(avgSpeed.toFixed(2)),
        sampleSize: unitsWithData,
      },
      inactiveSummary: {
        inactiveCount: inactiveUnits,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener estadisticas operativas' });
  }
};

module.exports = { getManagerStats };
