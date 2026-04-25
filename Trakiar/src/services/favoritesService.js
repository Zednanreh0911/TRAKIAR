import AsyncStorage from '@react-native-async-storage/async-storage';

const keyForUser = (userId) => `trakiar_favorites_${String(userId || 'anon')}`;

const normalizeRoute = (routeItem) => ({
  id: Number(routeItem?.id),
  id_linea: routeItem?.id_linea ?? null,
  linea_nombre: routeItem?.linea_nombre || 'Sin línea',
  nombre: routeItem?.nombre || 'Ruta sin nombre',
  descripcion: routeItem?.descripcion || '',
});

export const getFavoriteRoutes = async (userId) => {
  const raw = await AsyncStorage.getItem(keyForUser(userId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveFavoriteRoutes = async (userId, routes) => {
  await AsyncStorage.setItem(keyForUser(userId), JSON.stringify(routes));
};

export const isRouteFavorite = (favorites, routeId) =>
  favorites.some((item) => Number(item.id) === Number(routeId));

export const toggleFavoriteRoute = async (userId, routeItem) => {
  const current = await getFavoriteRoutes(userId);
  const routeId = Number(routeItem?.id);

  if (!Number.isFinite(routeId)) {
    return current;
  }

  const exists = current.some((item) => Number(item.id) === routeId);
  const next = exists
    ? current.filter((item) => Number(item.id) !== routeId)
    : [normalizeRoute(routeItem), ...current];

  await saveFavoriteRoutes(userId, next);
  return next;
};
