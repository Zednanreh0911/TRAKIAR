import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AnimatedEntrance from '../components/AnimatedEntrance';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppHeroHeader from '../components/AppHeroHeader';
import AppInput from '../components/AppInput';
import AppScreen from '../components/AppScreen';
import RouteResultCard from '../components/RouteResultCard';
import { useAuth } from '../context/AuthContext';
import { getFavoriteRoutes, isRouteFavorite, toggleFavoriteRoute } from '../services/favoritesService';
import { searchRoutes } from '../services/apiService';
import { colors } from '../theme/colors';
import { getErrorText } from '../utils/error';

export default function HomeScreen({ navigation }) {
  const { user, token } = useAuth();
  const [query, setQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [routes, setRoutes] = useState([]);
  const [searched, setSearched] = useState(false);
  const [favorites, setFavorites] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const loadFavorites = async () => {
        const stored = await getFavoriteRoutes(user?.id);
        setFavorites(stored);
      };

      loadFavorites();
    }, [user?.id])
  );

  const handleSearch = async () => {
    const normalized = query.trim();

    if (normalized.length < 2) {
      setSearchError('Escribe al menos 2 caracteres para buscar rutas.');
      return;
    }

    try {
      setLoadingSearch(true);
      setSearchError('');
      const response = await searchRoutes(token, normalized);
      setRoutes(response?.rutas || []);
      setSearched(true);
    } catch (error) {
      setRoutes([]);
      setSearched(true);
      setSearchError(getErrorText(error));
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectRoute = (routeItem) => {
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
          <View style={styles.hero}>
            <AppHeroHeader
              title="Bienvenido a trakiar"
              subtitle="Encuentra tu ruta y ve en el mapa el recorrido y el punto próximo de arribo."
            />
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance delay={60}>
          <AppCard>
          <Text style={styles.sectionTitle}>¿A dónde quieres ir?</Text>
          <View style={styles.gap10}>
            <AppInput
              value={query}
              onChangeText={setQuery}
              placeholder="¿a donde quieres ir?"
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <AppButton
              title={loadingSearch ? 'Buscando...' : 'Buscar'}
              iconName="magnify"
              onPress={handleSearch}
              loading={loadingSearch}
            />
          </View>

          {!!searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
          </AppCard>
        </AnimatedEntrance>

        {searched && routes.length === 0 && !loadingSearch ? (
          <AnimatedEntrance delay={110}>
            <AppCard variant="soft">
              <Text style={styles.sectionTitle}>Sin coincidencias</Text>
              <Text style={styles.detail}>Prueba con otra palabra clave o el nombre de la línea.</Text>
            </AppCard>
          </AnimatedEntrance>
        ) : null}

        {routes.map((routeItem, index) => (
          <AnimatedEntrance key={String(routeItem.id)} delay={90 + index * 35}>
            <RouteResultCard
              routeItem={routeItem}
              onPress={() => handleSelectRoute(routeItem)}
              isFavorite={isRouteFavorite(favorites, routeItem.id)}
              onToggleFavorite={() => handleToggleFavorite(routeItem)}
            />
          </AnimatedEntrance>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
    gap: 16,
  },
  hero: {
    gap: 8,
    marginTop: 6,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  detail: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  gap10: {
    gap: 10,
  },
  errorText: {
    marginTop: 10,
    color: colors.danger,
    lineHeight: 19,
    fontWeight: '600',
  },
});
