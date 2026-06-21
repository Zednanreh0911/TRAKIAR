const pool = require("../db");

const splitSearchTokens = (input) =>
  String(input || "")
    .toLowerCase()
    .split(/[\s,.;:()\-_/]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 8);

const escapeLikeToken = (value) => value.replace(/[\\%_]/g, "\\$&");

const EARTH_RADIUS_KM = 6371;
const MIN_OPERATIONAL_SPEED_KMH = 8;
const DEFAULT_FALLBACK_SPEED_KMH = 20;
const RECENT_LOCATION_MAX_AGE_SECONDS = 120;
const HISTORICAL_STOP_RADIUS_KM = 0.15;

const normalizeMapboxPrimaryMode = (value) => {
  const normalized = String(value || "directions")
    .trim()
    .toLowerCase();
  return normalized === "matching" ? "matching" : "directions";
};

const getRoutingSettings = () => ({
  provider: "mapbox",
  timeoutMs: Math.max(1000, Number(process.env.MAPBOX_TIMEOUT_MS || 7000)),
  maxWaypoints: Math.max(2, Number(process.env.MAPBOX_MAX_WAYPOINTS || 25)),
  minInputDistanceMeters: Math.max(
    20,
    Number(process.env.MAPBOX_MIN_INPUT_DISTANCE_METERS || 90),
  ),
  maxDetourRatio: Math.max(
    1.1,
    Number(process.env.MAPBOX_MAX_DETOUR_RATIO || 1.8),
  ),
  segmentFallbackMinPairs: Math.max(
    2,
    Number(process.env.MAPBOX_SEGMENT_FALLBACK_MIN_PAIRS || 4),
  ),
  segmentFallbackMaxPairs: Math.max(
    2,
    Number(process.env.MAPBOX_SEGMENT_FALLBACK_MAX_PAIRS || 8),
  ),
  mapboxBaseUrl: String(
    process.env.MAPBOX_BASE_URL || "https://api.mapbox.com",
  ).replace(/\/$/, ""),
  mapboxToken: String(process.env.MAPBOX_ACCESS_TOKEN || "").trim(),
  mapboxProfile: String(process.env.MAPBOX_PROFILE || "driving").trim(),
  mapboxTimeoutMs: Math.max(
    1000,
    Number(process.env.MAPBOX_TIMEOUT_MS || 7000),
  ),
  mapboxMaxCoordinates: Math.max(
    2,
    Number(process.env.MAPBOX_MAX_COORDINATES || 100),
  ),
  mapboxPrimaryMode: normalizeMapboxPrimaryMode(
    process.env.MAPBOX_PRIMARY_MODE,
  ),
});

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

const buildEtaMinutes = (distanceKm, speedKmh) => {
  if (
    !Number.isFinite(distanceKm) ||
    distanceKm < 0 ||
    !Number.isFinite(speedKmh) ||
    speedKmh <= 0
  ) {
    return null;
  }

  return (distanceKm / speedKmh) * 60;
};

const normalizeSpeed = (speed) => {
  if (!Number.isFinite(speed)) {
    return null;
  }

  if (speed <= 0) {
    return MIN_OPERATIONAL_SPEED_KMH;
  }

  return Math.max(speed, MIN_OPERATIONAL_SPEED_KMH);
};

const toFallbackRouteShape = (routePoints, reason = "fallback_points") => ({
  source: "fallback",
  fallbackReason: reason,
  inputPoints: routePoints.length,
  totalPoints: routePoints.length,
  coordinates: routePoints,
});

const distanceMeters = (a, b) =>
  haversineKm(
    Number(a.latitud),
    Number(a.longitud),
    Number(b.latitud),
    Number(b.longitud),
  ) * 1000;

const polylineDistanceKm = (points) => {
  if (!Array.isArray(points) || points.length < 2) {
    return 0;
  }

  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineKm(
      Number(points[i - 1].latitud),
      Number(points[i - 1].longitud),
      Number(points[i].latitud),
      Number(points[i].longitud),
    );
  }

  return total;
};

const downsampleRoutePoints = (routePoints, maxPoints) => {
  if (!Array.isArray(routePoints) || routePoints.length <= maxPoints) {
    return routePoints;
  }

  const step = (routePoints.length - 1) / (maxPoints - 1);
  return Array.from(
    { length: maxPoints },
    (_, index) => routePoints[Math.round(index * step)],
  );
};

const simplifyRoutePointsForRouting = (routePoints, minDistanceMeters) => {
  if (!Array.isArray(routePoints) || routePoints.length === 0) {
    return [];
  }

  const filtered = [];

  for (const point of routePoints) {
    if (
      !Number.isFinite(Number(point?.latitud)) ||
      !Number.isFinite(Number(point?.longitud))
    ) {
      continue;
    }

    const normalizedPoint = {
      ...point,
      latitud: Number(point.latitud),
      longitud: Number(point.longitud),
    };

    if (filtered.length === 0) {
      filtered.push(normalizedPoint);
      continue;
    }

    const last = filtered[filtered.length - 1];
    if (distanceMeters(last, normalizedPoint) < minDistanceMeters) {
      filtered[filtered.length - 1] = normalizedPoint;
      continue;
    }

    filtered.push(normalizedPoint);
  }

  if (filtered.length < 3) {
    return filtered;
  }

  const noSpikes = [filtered[0]];
  for (let i = 1; i < filtered.length - 1; i += 1) {
    const prev = noSpikes[noSpikes.length - 1];
    const curr = filtered[i];
    const next = filtered[i + 1];

    const prevToCurr = distanceMeters(prev, curr);
    const currToNext = distanceMeters(curr, next);
    const prevToNext = distanceMeters(prev, next);

    const isShortSpike =
      prevToCurr < minDistanceMeters * 1.8 &&
      currToNext < minDistanceMeters * 1.8 &&
      prevToNext < minDistanceMeters * 1.25;

    if (!isShortSpike) {
      noSpikes.push(curr);
    }
  }
  noSpikes.push(filtered[filtered.length - 1]);

  return noSpikes;
};

const parseGeometryCoordinates = (coords) => {
  if (!Array.isArray(coords)) {
    return [];
  }

  return coords
    .map((coord, index) => {
      const lon = Number(coord?.[0]);
      const lat = Number(coord?.[1]);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      return {
        id: null,
        nombre: `Tramo ${index + 1}`,
        orden: index + 1,
        latitud: lat,
        longitud: lon,
      };
    })
    .filter(Boolean);
};

const mergeMatchingGeometries = (matchings) => {
  if (!Array.isArray(matchings) || matchings.length === 0) {
    return [];
  }

  const merged = [];

  for (const matching of matchings) {
    const coords = parseGeometryCoordinates(
      matching?.geometry?.coordinates || [],
    );
    for (const point of coords) {
      const last = merged[merged.length - 1];
      if (
        last &&
        last.latitud === point.latitud &&
        last.longitud === point.longitud
      ) {
        continue;
      }

      merged.push({
        ...point,
        orden: merged.length + 1,
        nombre: `Tramo ${merged.length + 1}`,
      });
    }
  }

  return merged;
};
const formatRoutingError = (error, prefix = "mapbox") => {
  if (error?.name === "AbortError") {
    return `${prefix}_timeout`;
  }

  return String(error?.message || `${prefix}_error`);
};

const toCoordsPath = (points) =>
  points.map((point) => `${point.longitud},${point.latitud}`).join(";");

const chunkRoutePointsWithOverlap = (points, maxPerChunk) => {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  if (points.length <= maxPerChunk) {
    return [points];
  }

  const chunks = [];
  let start = 0;

  while (start < points.length) {
    const end = Math.min(points.length, start + maxPerChunk);
    const chunk = points.slice(start, end);

    if (chunks.length > 0 && start > 0) {
      chunks.push([points[start - 1], ...chunk]);
    } else {
      chunks.push(chunk);
    }

    start = end;
  }

  return chunks;
};

const fetchMapboxJson = async (path, settings) => {
  if (!settings.mapboxToken) {
    throw new Error("mapbox_token_missing");
  }

  const separator = path.includes("?") ? "&" : "?";
  const url = `${settings.mapboxBaseUrl}${path}${separator}access_token=${encodeURIComponent(settings.mapboxToken)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    settings.mapboxTimeoutMs,
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const compactText = String(text || "")
        .replace(/\s+/g, " ")
        .trim();
      const message = compactText
        ? `mapbox_http_${response.status}:${compactText.slice(0, 120)}`
        : `mapbox_http_${response.status}`;
      throw new Error(message);
    }

    const payload = await response.json();
    if (String(payload?.code || "").toLowerCase() !== "ok") {
      throw new Error(`mapbox_code_${payload?.code || "error"}`);
    }

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
};

const mergeCoordinateCollections = (collections) => {
  const merged = [];

  for (const points of collections) {
    for (const point of points || []) {
      const last = merged[merged.length - 1];
      if (
        last &&
        last.latitud === point.latitud &&
        last.longitud === point.longitud
      ) {
        continue;
      }

      merged.push({
        ...point,
        orden: merged.length + 1,
        nombre: `Tramo ${merged.length + 1}`,
      });
    }
  }

  return merged;
};

const buildMapboxMatchingGeometry = async (sampledPoints, settings) => {
  const chunks = chunkRoutePointsWithOverlap(
    sampledPoints,
    settings.mapboxMaxCoordinates,
  );
  const mergedCollections = [];

  for (const chunk of chunks) {
    if (!Array.isArray(chunk) || chunk.length < 2) {
      continue;
    }

    const coordsPath = toCoordsPath(chunk);
    const payload = await fetchMapboxJson(
      `/matching/v5/mapbox/${settings.mapboxProfile}/${coordsPath}?geometries=geojson&overview=full&steps=false&tidy=true`,
      settings,
    );

    mergedCollections.push(mergeMatchingGeometries(payload?.matchings || []));
  }

  return mergeCoordinateCollections(mergedCollections);
};

const buildMapboxDirectionsGeometry = async (sampledPoints, settings) => {
  const chunks = chunkRoutePointsWithOverlap(
    sampledPoints,
    settings.mapboxMaxCoordinates,
  );
  const mergedCollections = [];

  for (const chunk of chunks) {
    if (!Array.isArray(chunk) || chunk.length < 2) {
      continue;
    }

    const coordsPath = toCoordsPath(chunk);
    const payload = await fetchMapboxJson(
      `/directions/v5/mapbox/${settings.mapboxProfile}/${coordsPath}?geometries=geojson&overview=full&steps=false&continue_straight=true`,
      settings,
    );

    mergedCollections.push(
      parseGeometryCoordinates(
        payload?.routes?.[0]?.geometry?.coordinates || [],
      ),
    );
  }

  return mergeCoordinateCollections(mergedCollections);
};

const buildSegmentedMapboxGeometry = async (sampledPoints, settings) => {
  if (!Array.isArray(sampledPoints) || sampledPoints.length < 2) {
    return [];
  }

  const mergedCollections = [];

  for (let index = 1; index < sampledPoints.length; index += 1) {
    const a = sampledPoints[index - 1];
    const b = sampledPoints[index];
    const coordsPath = `${a.longitud},${a.latitud};${b.longitud},${b.latitud}`;

    const payload = await fetchMapboxJson(
      `/directions/v5/mapbox/${settings.mapboxProfile}/${coordsPath}?geometries=geojson&overview=full&steps=false&continue_straight=true`,
      settings,
    );

    mergedCollections.push(
      parseGeometryCoordinates(
        payload?.routes?.[0]?.geometry?.coordinates || [],
      ),
    );
  }

  return mergeCoordinateCollections(mergedCollections);
};

const buildRouteShape = async (
  routePoints,
  settings = getRoutingSettings(),
) => {
  if (!Array.isArray(routePoints) || routePoints.length < 2) {
    return {
      ...toFallbackRouteShape(routePoints || [], "insufficient_points"),
      settings,
    };
  }

  const simplified = simplifyRoutePointsForRouting(
    routePoints,
    settings.minInputDistanceMeters,
  );
  const sampled = downsampleRoutePoints(
    simplified,
    Math.min(settings.maxWaypoints, settings.mapboxMaxCoordinates),
  );

  if (sampled.length < 2) {
    return {
      ...toFallbackRouteShape(
        routePoints,
        "insufficient_points_after_simplify",
      ),
      settings,
    };
  }

  try {
    let parsedCoordinates = [];
    let routingWarning = null;
    const runDirectionsFirst = settings.mapboxPrimaryMode === "directions";

    if (runDirectionsFirst) {
      try {
        parsedCoordinates = await buildMapboxDirectionsGeometry(
          sampled,
          settings,
        );
      } catch (error) {
        routingWarning = `directions_${formatRoutingError(error, "mapbox")}`;
      }

      try {
        if (parsedCoordinates.length < 2) {
          parsedCoordinates = await buildMapboxMatchingGeometry(
            sampled,
            settings,
          );
        }
      } catch (error) {
        const matchFailureReason = formatRoutingError(error, "mapbox");
        routingWarning = [routingWarning, `matching_${matchFailureReason}`]
          .filter(Boolean)
          .join("|");

        if (sampled.length - 1 >= settings.segmentFallbackMinPairs) {
          const segmentedInput = downsampleRoutePoints(
            sampled,
            Math.min(sampled.length, settings.segmentFallbackMaxPairs + 1),
          );
          parsedCoordinates = await buildSegmentedMapboxGeometry(
            segmentedInput,
            settings,
          );
        }
      }
    } else {
      try {
        parsedCoordinates = await buildMapboxMatchingGeometry(
          sampled,
          settings,
        );
      } catch (error) {
        routingWarning = `matching_${formatRoutingError(error, "mapbox")}`;
      }

      try {
        if (parsedCoordinates.length < 2) {
          parsedCoordinates = await buildMapboxDirectionsGeometry(
            sampled,
            settings,
          );
        }
      } catch (error) {
        const routeFailureReason = formatRoutingError(error, "mapbox");
        routingWarning = [routingWarning, `directions_${routeFailureReason}`]
          .filter(Boolean)
          .join("|");

        if (sampled.length - 1 >= settings.segmentFallbackMinPairs) {
          const segmentedInput = downsampleRoutePoints(
            sampled,
            Math.min(sampled.length, settings.segmentFallbackMaxPairs + 1),
          );
          parsedCoordinates = await buildSegmentedMapboxGeometry(
            segmentedInput,
            settings,
          );
        }
      }
    }

    const inputDistanceKm = polylineDistanceKm(sampled);
    const resultDistanceKm = polylineDistanceKm(parsedCoordinates);
    const detourRatio =
      inputDistanceKm > 0 ? resultDistanceKm / inputDistanceKm : 1;

    if (
      sampled.length - 1 >= settings.segmentFallbackMinPairs &&
      Number.isFinite(detourRatio) &&
      detourRatio > settings.maxDetourRatio
    ) {
      const segmentedInput = downsampleRoutePoints(
        sampled,
        Math.min(sampled.length, settings.segmentFallbackMaxPairs + 1),
      );
      const segmented = await buildSegmentedMapboxGeometry(
        segmentedInput,
        settings,
      );
      const segmentedDistanceKm = polylineDistanceKm(segmented);
      const segmentedDetourRatio =
        inputDistanceKm > 0 ? segmentedDistanceKm / inputDistanceKm : 1;

      if (segmented.length >= 2 && segmentedDetourRatio <= detourRatio) {
        parsedCoordinates = segmented;
      }
    }

    if (parsedCoordinates.length < 2) {
      return {
        ...toFallbackRouteShape(
          routePoints,
          routingWarning || "mapbox_empty_geometry",
        ),
        settings,
      };
    }

    return {
      source: "mapbox",
      fallbackReason: null,
      routingWarning,
      settings,
      inputPoints: routePoints.length,
      simplifiedInputPoints: simplified.length,
      sampledInputPoints: sampled.length,
      inputDistanceKm: Number(polylineDistanceKm(sampled).toFixed(3)),
      routeDistanceKm: Number(polylineDistanceKm(parsedCoordinates).toFixed(3)),
      totalPoints: parsedCoordinates.length,
      coordinates: parsedCoordinates,
    };
  } catch (error) {
    const reason = formatRoutingError(error, "mapbox");
    return {
      ...toFallbackRouteShape(routePoints, reason),
      settings,
    };
  }
};

const getGerenteLinea = async (idUsuario) => {
  const result = await pool.query(
    "SELECT id_linea FROM gerente_linea WHERE id_usuario = $1 LIMIT 1",
    [idUsuario],
  );

  return result.rows[0] || null;
};

// Controlador para agregar una nueva ruta
const addRoute = async (req, res) => {
  const { nombre, descripcion } = req.body;

  // Validar que los campos requeridos estén presentes
  if (!nombre || !descripcion) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    const gerenteLinea = await getGerenteLinea(req.user.id);
    if (!gerenteLinea) {
      return res
        .status(403)
        .json({ error: "No tienes una línea asignada para gestionar rutas" });
    }

    // Insertar la nueva ruta
    const nuevaRuta = await pool.query(
      "INSERT INTO ruta (id_linea, nombre, descripcion, created_at, modified_by) VALUES ($1, $2, $3, now(), $4) RETURNING *",
      [gerenteLinea.id_linea, nombre, descripcion, req.user.id],
    );

    res
      .status(201)
      .json({ message: "Ruta creada exitosamente", ruta: nuevaRuta.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear la ruta" });
  }
};

const listRoutesByLine = async (req, res) => {
  try {
    const gerenteLinea = await getGerenteLinea(req.user.id);
    if (!gerenteLinea) {
      return res
        .status(403)
        .json({ error: "No tienes una línea asignada para ver rutas" });
    }

    const { fechaDesde, fechaHasta } = req.query;
    const params = [gerenteLinea.id_linea];
    const dateFilters = [];

    if (fechaDesde) {
      params.push(fechaDesde);
      dateFilters.push(`r.created_at >= $${params.length}::date`);
    }

    if (fechaHasta) {
      params.push(fechaHasta);
      dateFilters.push(`r.created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    const whereClause =
      dateFilters.length > 0
        ? `AND ${dateFilters.join(" AND ")}`
        : "";

    const rutas = await pool.query(
      `SELECT
         r.id,
         r.id_linea,
         r.nombre,
         r.descripcion,
         r.created_at,
         r.modified_at,
         r.modified_by,
         modifier.nombre AS modified_by_nombre
       FROM ruta r
       LEFT JOIN usuario modifier ON modifier.id = r.modified_by
       WHERE r.id_linea = $1 ${whereClause}
       ORDER BY r.id DESC`,
      params,
    );

    return res.status(200).json({
      message: "Rutas obtenidas exitosamente",
      idLinea: gerenteLinea.id_linea,
      filtros: { fechaDesde: fechaDesde || null, fechaHasta: fechaHasta || null },
      rutas: rutas.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al listar rutas" });
  }
};

const searchRoutes = async (req, res) => {
  const queryText = String(req.query.q || "").trim();
  const tokens = splitSearchTokens(queryText);

  if (tokens.length === 0) {
    return res
      .status(400)
      .json({ error: "Debes enviar un texto de búsqueda (parámetro q)." });
  }

  try {
    const whereClauses = tokens.map(
      (_, index) =>
        `(LOWER(COALESCE(r.nombre, '')) LIKE $${index + 1} ESCAPE '\\'
          OR LOWER(COALESCE(r.descripcion, '')) LIKE $${index + 1} ESCAPE '\\'
          OR LOWER(COALESCE(l.nombre, '')) LIKE $${index + 1} ESCAPE '\\')`,
    );

    const params = tokens.map((token) => `%${escapeLikeToken(token)}%`);

    const rutas = await pool.query(
      `SELECT
         r.id,
         r.id_linea,
         l.nombre AS linea_nombre,
         l.tipo_linea AS linea_tipo,
         r.nombre,
         r.descripcion,
         r.created_at,
         r.modified_at,
         r.modified_by
       FROM ruta r
       INNER JOIN linea l ON l.id = r.id_linea
       WHERE ${whereClauses.join(" AND ")}
       ORDER BY r.id DESC
       LIMIT 50`,
      params,
    );

    return res.status(200).json({
      message: "Búsqueda de rutas completada",
      query: queryText,
      tokens,
      total: rutas.rows.length,
      rutas: rutas.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al buscar rutas" });
  }
};

const listPublicRoutesCatalog = async (req, res) => {
  try {
    const isPassenger = req.user?.rol === "pasajero";
    const passengerType = String(
      req.user?.tipoLinea || "natural",
    ).toLowerCase();

    const result = await pool.query(
      `SELECT
         l.id AS id_linea,
         l.nombre AS linea_nombre,
         l.tipo_linea AS linea_tipo,
         r.id AS id_ruta,
         r.nombre AS ruta_nombre,
         r.descripcion AS ruta_descripcion,
         r.created_at AS ruta_created_at,
         r.modified_at AS ruta_modified_at,
         r.modified_by AS ruta_modified_by
       FROM linea l
       LEFT JOIN ruta r ON r.id_linea = l.id
       WHERE ($1 = FALSE) OR ($2 = 'estudiantes' OR l.tipo_linea = 'natural')
       ORDER BY l.nombre ASC, r.nombre ASC, r.id ASC`,
      [isPassenger, passengerType],
    );

    const grouped = [];
    const byLine = new Map();

    for (const row of result.rows) {
      const lineId = Number(row.id_linea);

      if (!byLine.has(lineId)) {
        const line = {
          id_linea: lineId,
          linea_nombre: row.linea_nombre,
          linea_tipo: row.linea_tipo,
          total_rutas: 0,
          rutas: [],
        };
        byLine.set(lineId, line);
        grouped.push(line);
      }

      if (row.id_ruta) {
        byLine.get(lineId).rutas.push({
          id: Number(row.id_ruta),
          id_linea: lineId,
          linea_nombre: row.linea_nombre,
          linea_tipo: row.linea_tipo,
          nombre: row.ruta_nombre,
          descripcion: row.ruta_descripcion,
          created_at: row.ruta_created_at,
          modified_at: row.ruta_modified_at,
          modified_by: row.ruta_modified_by,
        });
      }
    }

    for (const line of grouped) {
      line.total_rutas = line.rutas.length;
    }

    return res.status(200).json({
      message: "Catálogo de líneas y rutas obtenido exitosamente",
      totalLineas: grouped.length,
      totalRutas: grouped.reduce((acc, item) => acc + item.total_rutas, 0),
      lineas: grouped,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Error al obtener el catálogo de rutas." });
  }
};

const estimateEtaToNearestStop = async (req, res) => {
  const idRuta = Number(req.params.idRuta);
  const latitudUsuario = toFiniteNumber(req.query.latitud);
  const longitudUsuario = toFiniteNumber(req.query.longitud);
  const idUnidad = req.query.idUnidad ? Number(req.query.idUnidad) : null;

  if (!Number.isFinite(idRuta)) {
    return res.status(400).json({ error: "El parámetro idRuta no es válido." });
  }

  if (!Number.isFinite(latitudUsuario) || !Number.isFinite(longitudUsuario)) {
    return res
      .status(400)
      .json({ error: "Debes enviar latitud y longitud válidas del usuario." });
  }

  if (idUnidad !== null && !Number.isFinite(idUnidad)) {
    return res
      .status(400)
      .json({ error: "El parámetro idUnidad no es válido." });
  }

  try {
    const rutaResult = await pool.query(
      `SELECT r.id, r.id_linea, r.nombre, l.nombre AS linea_nombre
       FROM ruta r
       INNER JOIN linea l ON l.id = r.id_linea
       WHERE r.id = $1
       LIMIT 1`,
      [idRuta],
    );

    if (rutaResult.rows.length === 0) {
      return res.status(404).json({ error: "Ruta no encontrada." });
    }

    const ruta = rutaResult.rows[0];

    const nearestStopResult = await pool.query(
      `SELECT
         pi.id,
         pi.id_ruta,
         pi.nombre,
         pi.orden,
         pi.latitud,
         pi.longitud,
         (
           ${EARTH_RADIUS_KM} * 2 * ASIN(
             SQRT(
               POWER(SIN(RADIANS(($1::numeric - pi.latitud) / 2)), 2) +
               COS(RADIANS($1::numeric)) * COS(RADIANS(pi.latitud)) *
               POWER(SIN(RADIANS(($2::numeric - pi.longitud) / 2)), 2)
             )
           )
         ) AS distancia_usuario_km
       FROM punto_interes pi
       WHERE pi.id_ruta = $3
       ORDER BY distancia_usuario_km ASC
       LIMIT 1`,
      [latitudUsuario, longitudUsuario, idRuta],
    );

    if (nearestStopResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "La ruta no tiene puntos de interés configurados." });
    }

    const nearestStop = nearestStopResult.rows[0];
    const stopLat = Number(nearestStop.latitud);
    const stopLng = Number(nearestStop.longitud);
    const userToStopKm = Number(nearestStop.distancia_usuario_km) || 0;

    const routeGeometryResult = await pool.query(
      `SELECT id, nombre, orden, latitud, longitud
       FROM punto_interes
       WHERE id_ruta = $1
       ORDER BY orden ASC, id ASC`,
      [idRuta],
    );

    const rawRoutePoints = routeGeometryResult.rows.map((point) => ({
      id: point.id,
      nombre: point.nombre,
      orden: point.orden,
      latitud: Number(point.latitud),
      longitud: Number(point.longitud),
    }));

    const routeShape = await buildRouteShape(rawRoutePoints);

    console.log("[ETA routeShape]", {
      idRuta,
      source: routeShape?.source,
      fallbackReason: routeShape?.fallbackReason || null,
      inputPoints: routeShape?.inputPoints,
      totalPoints: routeShape?.totalPoints,
      settings: routeShape?.settings || null,
    });

    const unitFilterClause = idUnidad ? "AND u.id_unidad = $2" : "";
    const recentLocationParams = idUnidad ? [idRuta, idUnidad] : [idRuta];

    const recentLocationResult = await pool.query(
      `SELECT DISTINCT ON (u.id_unidad)
         u.id_unidad,
         u.id_ruta,
         u.latitud,
         u.longitud,
         u.velocidad_kmh,
         u.created_at,
         EXTRACT(EPOCH FROM (NOW() - u.created_at))::int AS age_seconds
       FROM ubicacion u
       WHERE u.id_ruta = $1
         AND u.created_at >= NOW() - INTERVAL '5 minutes'
         ${unitFilterClause}
       ORDER BY u.id_unidad, u.created_at DESC`,
      recentLocationParams,
    );

    const activeUnits = recentLocationResult.rows.filter(
      (row) => Number(row.age_seconds) <= RECENT_LOCATION_MAX_AGE_SECONDS
    );

    let recent = null;
    let minDistance = Infinity;

    for (const unit of activeUnits) {
      const dist = haversineKm(
        Number(unit.latitud),
        Number(unit.longitud),
        stopLat,
        stopLng
      );
      if (dist < minDistance) {
        minDistance = dist;
        recent = unit;
      }
    }

    if (
      recent &&
      Number(recent.age_seconds) <= RECENT_LOCATION_MAX_AGE_SECONDS
    ) {
      const busToStopKm = haversineKm(
        Number(recent.latitud),
        Number(recent.longitud),
        stopLat,
        stopLng,
      );
      const speedKmh = normalizeSpeed(
        toFiniteNumber(recent.velocidad_kmh) || DEFAULT_FALLBACK_SPEED_KMH,
      );
      const etaMinutes = buildEtaMinutes(busToStopKm, speedKmh);

      if (etaMinutes !== null) {
        return res.status(200).json({
          message: "ETA estimado con ubicación en tiempo real reciente.",
          mode: "realtime_recent",
          confidence: "high",
          etaMinutos: Math.max(1, Math.round(etaMinutes)),
          etaRangoMinutos: {
            min: Math.max(1, Math.round(etaMinutes * 0.85)),
            max: Math.max(1, Math.round(etaMinutes * 1.2)),
          },
          metadata: {
            idRuta: ruta.id,
            rutaNombre: ruta.nombre,
            lineaNombre: ruta.linea_nombre,
            idUnidad: recent.id_unidad,
            ageSeconds: Number(recent.age_seconds),
            speedKmhUsed: speedKmh,
          },
          routeShape,
          nearestStop: {
            id: nearestStop.id,
            nombre: nearestStop.nombre,
            orden: nearestStop.orden,
            latitud: stopLat,
            longitud: stopLng,
            distanciaUsuarioKm: Number(userToStopKm.toFixed(3)),
          },
          bus: {
            latitud: Number(recent.latitud),
            longitud: Number(recent.longitud),
            distanciaBusStopKm: Number(busToStopKm.toFixed(3)),
            lastSeenAt: recent.created_at,
          },
        });
      }
    }

    const historicalPassResult = await pool.query(
      `WITH near_events AS (
         SELECT
           u.id_unidad,
           u.created_at,
           (
             ${EARTH_RADIUS_KM} * 2 * ASIN(
               SQRT(
                 POWER(SIN(RADIANS((pi.latitud - u.latitud) / 2)), 2) +
                 COS(RADIANS(u.latitud)) * COS(RADIANS(pi.latitud)) *
                 POWER(SIN(RADIANS((pi.longitud - u.longitud) / 2)), 2)
               )
             )
           ) AS distancia_stop_km
         FROM ubicacion u
         INNER JOIN punto_interes pi ON pi.id = $2
         WHERE u.id_ruta = $1
           AND u.created_at >= NOW() - INTERVAL '60 days'
           AND EXTRACT(DOW FROM u.created_at) = EXTRACT(DOW FROM NOW())
           AND EXTRACT(HOUR FROM u.created_at) = EXTRACT(HOUR FROM NOW())
           ${idUnidad ? "AND u.id_unidad = $3" : ""}
       ), filtered AS (
         SELECT *
         FROM near_events
         WHERE distancia_stop_km <= $${idUnidad ? "4" : "3"}
       ), passes AS (
         SELECT created_at
         FROM (
           SELECT
             created_at,
             EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) AS gap_prev_seconds
           FROM filtered
         ) s
         WHERE gap_prev_seconds IS NULL OR gap_prev_seconds > 180
       ), intervals AS (
         SELECT
           EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) / 60.0 AS gap_minutes
         FROM passes
       )
       SELECT
         (SELECT COUNT(*)::int FROM passes) AS total_passes,
         (SELECT COUNT(*)::int FROM intervals WHERE gap_minutes IS NOT NULL) AS total_intervals,
         (SELECT AVG(gap_minutes) FROM intervals WHERE gap_minutes IS NOT NULL) AS avg_headway_minutes`,
      idUnidad
        ? [idRuta, nearestStop.id, idUnidad, HISTORICAL_STOP_RADIUS_KM]
        : [idRuta, nearestStop.id, HISTORICAL_STOP_RADIUS_KM],
    );

    const historicalPass = historicalPassResult.rows[0] || {};
    const totalPasses = Number(historicalPass.total_passes || 0);
    const totalIntervals = Number(historicalPass.total_intervals || 0);
    const avgHeadwayMinutes = Number(historicalPass.avg_headway_minutes || 0);

    if (totalPasses >= 4 && totalIntervals >= 3 && avgHeadwayMinutes > 0) {
      const expectedWait = Math.max(1, Math.round(avgHeadwayMinutes / 2));

      return res.status(200).json({
        message:
          "ETA estimado con histórico por día de semana y hora en el punto cercano.",
        mode: "historical_day_hour",
        confidence: "medium",
        etaMinutos: expectedWait,
        etaRangoMinutos: {
          min: Math.max(1, Math.round(avgHeadwayMinutes * 0.3)),
          max: Math.max(1, Math.round(avgHeadwayMinutes * 0.9)),
        },
        metadata: {
          idRuta: ruta.id,
          rutaNombre: ruta.nombre,
          lineaNombre: ruta.linea_nombre,
          samplePasses: totalPasses,
          sampleIntervals: totalIntervals,
          avgHeadwayMinutes: Number(avgHeadwayMinutes.toFixed(2)),
        },
        routeShape,
        nearestStop: {
          id: nearestStop.id,
          nombre: nearestStop.nombre,
          orden: nearestStop.orden,
          latitud: stopLat,
          longitud: stopLng,
          distanciaUsuarioKm: Number(userToStopKm.toFixed(3)),
        },
      });
    }

    if (recent) {
      const busToStopKm = haversineKm(
        Number(recent.latitud),
        Number(recent.longitud),
        stopLat,
        stopLng,
      );
      const speedKmh = normalizeSpeed(
        toFiniteNumber(recent.velocidad_kmh) || DEFAULT_FALLBACK_SPEED_KMH,
      );
      const etaMinutes = buildEtaMinutes(busToStopKm, speedKmh);

      if (etaMinutes !== null) {
        return res.status(200).json({
          message:
            "ETA estimado con última velocidad conocida por falta de datos recientes/históricos suficientes.",
          mode: "last_known_speed",
          confidence: "low",
          etaMinutos: Math.max(1, Math.round(etaMinutes)),
          etaRangoMinutos: {
            min: Math.max(1, Math.round(etaMinutes * 0.7)),
            max: Math.max(1, Math.round(etaMinutes * 1.5)),
          },
          metadata: {
            idRuta: ruta.id,
            rutaNombre: ruta.nombre,
            lineaNombre: ruta.linea_nombre,
            idUnidad: recent.id_unidad,
            ageSeconds: Number(recent.age_seconds),
            speedKmhUsed: speedKmh,
            reason: "insufficient_historical_samples_or_stale_signal",
          },
          routeShape,
          nearestStop: {
            id: nearestStop.id,
            nombre: nearestStop.nombre,
            orden: nearestStop.orden,
            latitud: stopLat,
            longitud: stopLng,
            distanciaUsuarioKm: Number(userToStopKm.toFixed(3)),
          },
          bus: {
            latitud: Number(recent.latitud),
            longitud: Number(recent.longitud),
            distanciaBusStopKm: Number(busToStopKm.toFixed(3)),
            lastSeenAt: recent.created_at,
          },
        });
      }
    }

    return res.status(404).json({
      error: "No hay datos suficientes para estimar ETA en este momento.",
      routeShape,
      nearestStop: {
        id: nearestStop.id,
        nombre: nearestStop.nombre,
        orden: nearestStop.orden,
        latitud: stopLat,
        longitud: stopLng,
        distanciaUsuarioKm: Number(userToStopKm.toFixed(3)),
      },
      details: {
        reason: "no_recent_location_and_insufficient_historical_data",
        idRuta,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al estimar ETA de la ruta." });
  }
};

// Controlador para editar una ruta
const editRoute = async (req, res) => {
  const { idRuta } = req.params;
  const { nombre, descripcion } = req.body;

  // Validar que los campos requeridos estén presentes
  if (!nombre || !descripcion) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    // Verificar si la ruta existe y pertenece a una línea del gerente
    const ruta = await pool.query(
      "SELECT * FROM ruta WHERE id = $1 AND id_linea IN (SELECT id_linea FROM gerente_linea WHERE id_usuario = $2)",
      [idRuta, req.user.id],
    );

    if (ruta.rows.length === 0) {
      return res
        .status(404)
        .json({
          error: "Ruta no encontrada o no tienes permiso para editarla",
        });
    }

    // Actualizar la ruta
    const rutaActualizada = await pool.query(
      "UPDATE ruta SET nombre = $1, descripcion = $2, modified_by = $3 WHERE id = $4 RETURNING *",
      [nombre, descripcion, req.user.id, idRuta],
    );

    res
      .status(200)
      .json({
        message: "Ruta actualizada exitosamente",
        ruta: rutaActualizada.rows[0],
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar la ruta" });
  }
};

// Controlador para eliminar una ruta
const deleteRoute = async (req, res) => {
  const { idRuta } = req.params;

  try {
    // Verificar si la ruta existe y pertenece a una línea del gerente
    const ruta = await pool.query(
      "SELECT * FROM ruta WHERE id = $1 AND id_linea IN (SELECT id_linea FROM gerente_linea WHERE id_usuario = $2)",
      [idRuta, req.user.id],
    );

    if (ruta.rows.length === 0) {
      return res
        .status(404)
        .json({
          error: "Ruta no encontrada o no tienes permiso para eliminarla",
        });
    }

    // Eliminar la ruta
    await pool.query("DELETE FROM ruta WHERE id = $1", [idRuta]);

    res.status(200).json({ message: "Ruta eliminada exitosamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar la ruta" });
  }
};

module.exports = {
  addRoute,
  listRoutesByLine,
  searchRoutes,
  listPublicRoutesCatalog,
  estimateEtaToNearestStop,
  editRoute,
  deleteRoute,
};
