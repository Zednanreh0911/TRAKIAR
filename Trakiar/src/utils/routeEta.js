const EARTH_RADIUS_KM = 6371;
const MIN_OPERATIONAL_SPEED_KMH = 8;
const DEFAULT_FALLBACK_SPEED_KMH = 20;
const MAX_LOCATION_AGE_SECONDS = 120;

const toNumber = (value) => Number(value);

export const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

const normalizeSpeedKmh = (speedKmh) => {
  if (!Number.isFinite(speedKmh)) {
    return DEFAULT_FALLBACK_SPEED_KMH;
  }

  if (speedKmh <= 0) {
    return MIN_OPERATIONAL_SPEED_KMH;
  }

  return Math.max(speedKmh, MIN_OPERATIONAL_SPEED_KMH);
};

const estimateEtaMinutes = (distanceKm, speedKmh) => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return null;
  }

  if (!Number.isFinite(speedKmh) || speedKmh <= 0) {
    return null;
  }

  return (distanceKm / speedKmh) * 60;
};

export const formatDistanceKm = (distanceKm) => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return "Sin distancia";
  }

  if (distanceKm < 1) {
    const meters = Math.max(1, Math.round(distanceKm * 1000));
    return `${meters} m`;
  }

  return `${distanceKm.toFixed(2)} km`;
};

export const formatEtaMinutes = (etaMinutes) => {
  if (!Number.isFinite(etaMinutes)) {
    return "Sin ETA";
  }

  const rounded = Math.max(1, Math.round(etaMinutes));
  return rounded === 1 ? "1 min" : `${rounded} min`;
};

export const calculateRouteEta = (routeItem) => {
  const point = routeItem?.punto_clave;
  const pointLat = toNumber(point?.latitud);
  const pointLng = toNumber(point?.longitud);

  if (!Number.isFinite(pointLat) || !Number.isFinite(pointLng)) {
    return null;
  }

  const units = Array.isArray(routeItem?.unidades_recientes)
    ? routeItem.unidades_recientes
    : [];
  let best = null;

  for (const unit of units) {
    const ageSeconds = Number(
      unit?.age_seconds ?? unit?.ageSeconds ?? Number.POSITIVE_INFINITY,
    );
    if (Number.isFinite(ageSeconds) && ageSeconds > MAX_LOCATION_AGE_SECONDS) {
      continue;
    }

    const unitLat = toNumber(unit?.latitud ?? unit?.latitude);
    const unitLng = toNumber(unit?.longitud ?? unit?.longitude);

    if (!Number.isFinite(unitLat) || !Number.isFinite(unitLng)) {
      continue;
    }

    const speedKmh = normalizeSpeedKmh(
      toNumber(unit?.velocidad_kmh ?? unit?.velocidadKmh ?? unit?.speedKmh),
    );
    const distanceKm = haversineKm(unitLat, unitLng, pointLat, pointLng);
    const etaMinutes = estimateEtaMinutes(distanceKm, speedKmh);

    if (!Number.isFinite(etaMinutes)) {
      continue;
    }

    if (!best || etaMinutes < best.etaMinutes) {
      best = {
        etaMinutes,
        etaText: formatEtaMinutes(etaMinutes),
        distanceKm,
        distanceText: formatDistanceKm(distanceKm),
        unidadMasRapida: {
          id_unidad: unit.id_unidad != null ? Number(unit.id_unidad) : null,
          latitud: unitLat,
          longitud: unitLng,
          velocidad_kmh: speedKmh,
          age_seconds: Number.isFinite(ageSeconds) ? ageSeconds : null,
          created_at: unit.created_at || null,
        },
      };
    }
  }

  return best;
};

export const enrichRoutesWithEta = (routes) => {
  return (Array.isArray(routes) ? routes : [])
    .map((routeItem) => {
      const etaData = calculateRouteEta(routeItem);

      return {
        ...routeItem,
        tieneTiempoReal:
          Boolean(routeItem?.tiene_tiempo_real) ||
          Boolean(routeItem?.tieneTiempoReal),
        etaMinutos: etaData?.etaMinutes ?? null,
        etaText: etaData?.etaText ?? null,
        distanciaKm: etaData?.distanceKm ?? null,
        distanciaText: etaData?.distanceText ?? null,
        unidadMasRapida: etaData?.unidadMasRapida ?? null,
      };
    })
    .sort((left, right) => {
      const leftLive = Boolean(left.tieneTiempoReal);
      const rightLive = Boolean(right.tieneTiempoReal);

      if (leftLive !== rightLive) {
        return leftLive ? -1 : 1;
      }

      const leftEta = Number.isFinite(left.etaMinutos)
        ? left.etaMinutos
        : Number.POSITIVE_INFINITY;
      const rightEta = Number.isFinite(right.etaMinutos)
        ? right.etaMinutos
        : Number.POSITIVE_INFINITY;

      if (leftEta !== rightEta) {
        return leftEta - rightEta;
      }

      const leftDistance = Number.isFinite(left.distancia_usuario_km)
        ? left.distancia_usuario_km
        : Number.POSITIVE_INFINITY;
      const rightDistance = Number.isFinite(right.distancia_usuario_km)
        ? right.distancia_usuario_km
        : Number.POSITIVE_INFINITY;

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return String(left.nombre || "").localeCompare(
        String(right.nombre || ""),
      );
    });
};
