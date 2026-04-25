import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AnimatedEntrance from '../components/AnimatedEntrance';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppHeroHeader from '../components/AppHeroHeader';
import AppInput from '../components/AppInput';
import AppScreen from '../components/AppScreen';
import RouteResultCard from '../components/RouteResultCard';
import { useAuth } from '../context/AuthContext';
import { getRoutesCatalog } from '../services/apiService';
import { getFavoriteRoutes, isRouteFavorite, toggleFavoriteRoute } from '../services/favoritesService';
import { colors } from '../theme/colors';
import { getErrorText } from '../utils/error';

export default function RoutesCatalogScreen({ navigation }) {
  const { token, user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lineas, setLineas] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const refreshFavorites = useCallback(async () => {
    const storedFavorites = await getFavoriteRoutes(user?.id);
    setFavorites(storedFavorites);
  }, [user?.id]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      setError('');
      const [catalogResponse, storedFavorites] = await Promise.all([
        getRoutesCatalog(token),
        getFavoriteRoutes(user?.id),
      ]);
      setLineas(catalogResponse?.lineas || []);
      setFavorites(storedFavorites);
    } catch (err) {
      setError(getErrorText(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  useFocusEffect(
    useCallback(() => {
      refreshFavorites();
    }, [refreshFavorites])
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredLines = useMemo(() => {
    if (!normalizedQuery) {
      return lineas;
    }

    return lineas
      .map((linea) => ({
        ...linea,
        rutas: (linea.rutas || []).filter((ruta) => {
          const candidate = `${ruta.nombre || ''} ${ruta.descripcion || ''} ${ruta.linea_nombre || ''}`.toLowerCase();
          return candidate.includes(normalizedQuery);
        }),
      }))
      .filter((linea) => linea.rutas.length > 0);
  }, [lineas, normalizedQuery]);

  const handleOpenMap = (routeItem) => {
    navigation.navigate('UserMap', {
      selectedRouteId: String(routeItem.id),
      selectedRouteLabel: `${routeItem.nombre} · ${routeItem.linea_nombre || 'Sin línea'}`,
    });
  };

  const handleToggleFavorite = async (routeItem) => {
    const next = await toggleFavoriteRoute(user?.id, routeItem);
    setFavorites(next);
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <AnimatedEntrance>
          <AppHeroHeader
            title="Rutas"
            subtitle="Explora todas las líneas y abre cualquier ruta directamente en el mapa."
          />
        </AnimatedEntrance>

        <AnimatedEntrance delay={60}>
          <AppCard>
            <Text style={styles.sectionTitle}>Buscar en catálogo</Text>
            <AppInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por línea, ruta o descripción"
              autoCapitalize="none"
              returnKeyType="search"
            />
            <View style={styles.refreshWrap}>
              <AppButton
                title={loading ? 'Actualizando...' : 'Actualizar catálogo'}
                variant="secondary"
                iconName="refresh"
                loading={loading}
                onPress={loadCatalog}
              />
            </View>
            {!!error ? <Text style={styles.errorText}>{error}</Text> : null}
          </AppCard>
        </AnimatedEntrance>

        {filteredLines.length === 0 && !loading ? (
          <AnimatedEntrance delay={90}>
            <AppCard variant="soft">
              <Text style={styles.sectionTitle}>Sin resultados</Text>
              <Text style={styles.detail}>No hay rutas que coincidan con tu búsqueda.</Text>
            </AppCard>
          </AnimatedEntrance>
        ) : null}

        {filteredLines.map((linea, lineIndex) => (
          <AnimatedEntrance key={String(linea.id_linea)} delay={100 + lineIndex * 25}>
            <AppCard>
              <Text style={styles.lineTitle}>{linea.linea_nombre}</Text>
              <Text style={styles.detail}>Rutas disponibles: {(linea.rutas || []).length}</Text>

              <View style={styles.routesWrap}>
                {(linea.rutas || []).map((routeItem) => (
                  <RouteResultCard
                    key={String(routeItem.id)}
                    routeItem={routeItem}
                    onPress={() => handleOpenMap(routeItem)}
                    isFavorite={isRouteFavorite(favorites, routeItem.id)}
                    onToggleFavorite={() => handleToggleFavorite(routeItem)}
                  />
                ))}
              </View>
            </AppCard>
          </AnimatedEntrance>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
    gap: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  lineTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  detail: {
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 3,
  },
  refreshWrap: {
    marginTop: 10,
  },
  errorText: {
    marginTop: 10,
    color: colors.danger,
    fontWeight: '600',
  },
  routesWrap: {
    marginTop: 10,
    gap: 10,
  },
});
