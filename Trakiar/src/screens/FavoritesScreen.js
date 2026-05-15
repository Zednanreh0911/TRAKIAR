import { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AnimatedEntrance from '../components/AnimatedEntrance';
import AppCard from '../components/AppCard';
import AppHeroHeader from '../components/AppHeroHeader';
import AppScreen from '../components/AppScreen';
import RouteResultCard from '../components/RouteResultCard';
import { useAuth } from '../context/AuthContext';
import { getFavoriteRoutes, toggleFavoriteRoute } from '../services/favoritesService';
import { colors } from '../theme/colors';

export default function FavoritesScreen({ navigation }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);

  const refreshFavorites = useCallback(async () => {
    const stored = await getFavoriteRoutes(user?.id);
    setFavorites(stored);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refreshFavorites();
    }, [refreshFavorites])
  );

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
            title="Tus favoritos"
            subtitle="Guarda tus rutas frecuentes para abrir el mapa con un toque."
          />
        </AnimatedEntrance>

        {favorites.length === 0 ? (
          <AnimatedEntrance delay={60}>
            <AppCard>
              <Text style={styles.sectionTitle}>Aún no tienes favoritos</Text>
              <Text style={styles.detail}>Marca rutas con el ícono de corazón desde Inicio o Rutas.</Text>
            </AppCard>
          </AnimatedEntrance>
        ) : (
          <View style={styles.listWrap}>
            {favorites.map((routeItem, index) => (
              <AnimatedEntrance key={String(routeItem.id)} delay={70 + index * 25}>
                <RouteResultCard
                  routeItem={routeItem}
                  onPress={() => handleOpenMap(routeItem)}
                  isFavorite
                  onToggleFavorite={() => handleToggleFavorite(routeItem)}
                />
              </AnimatedEntrance>
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
    gap: 14,
    paddingTop: Platform.select({ ios: 10, android: 50, default: 50 }),
  },
  listWrap: {
    gap: 12,
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
});
