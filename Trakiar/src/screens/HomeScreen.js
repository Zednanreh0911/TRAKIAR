import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AnimatedEntrance from "../components/AnimatedEntrance";
import AppButton from "../components/AppButton";
import AppCard from "../components/AppCard";
import AppHeroHeader from "../components/AppHeroHeader";
import AppInput from "../components/AppInput";
import AppScreen from "../components/AppScreen";
import RouteResultCard from "../components/RouteResultCard";
import { useAuth } from "../context/AuthContext";
import {
  getFavoriteRoutes,
  isRouteFavorite,
  toggleFavoriteRoute,
} from "../services/favoritesService";
import { searchRoutes } from "../services/apiService";
import { getSearchLocation } from "../services/locationService";
import { colors } from "../theme/colors";
import { enrichRoutesWithEta } from "../utils/routeEta";
import { getErrorText } from "../utils/error";

export default function HomeScreen({ navigation }) {
  const { user, token } = useAuth();
  const [query, setQuery] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState("");
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
    }, [user?.id]),
  );

  const handleSearch = async () => {
    const normalized = query.trim();

    if (normalized.length < 2) {
      setSearchError("Escribe al menos 2 caracteres para buscar rutas.");
      return;
    }

    try {
      setLoadingSearch(true);
      setSearchError("");
      const searchLocation = await getSearchLocation();
      const response = await searchRoutes(token, normalized, searchLocation);
      setRoutes(enrichRoutesWithEta(response?.rutas || []));
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
    navigation.navigate("UserMap", {
      selectedRouteId: String(routeItem.id),
      selectedRouteLabel: `${routeItem.nombre} · ${routeItem.linea_nombre || "Sin línea"}`,
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
              subtitle="Busca por punto clave y ordena por el ETA local de la unidad que llegará primero."
            />
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance delay={60}>
          <AppCard>
            <View style={styles.searchRow}>
              <View style={styles.searchInputWrap}>
                <AppInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Escribe un punto clave"
                  autoCapitalize="none"
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                  style={styles.searchInput}
                />
              </View>
              <AppButton
                title="Buscar"
                iconName="magnify"
                iconOnly
                onPress={handleSearch}
                loading={loadingSearch}
                style={styles.searchButton}
              />
            </View>

            {!!searchError ? (
              <Text style={styles.errorText}>{searchError}</Text>
            ) : null}
          </AppCard>
        </AnimatedEntrance>

        {searched && routes.length === 0 && !loadingSearch ? (
          <AnimatedEntrance delay={110}>
            <AppCard>
              <Text style={styles.sectionTitle}>Sin coincidencias</Text>
              <Text style={styles.detail}>
                Prueba con otro punto clave, otro nombre de ruta o una variación
                del punto.
              </Text>
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
    paddingBottom: 40,
    gap: 24,
    paddingTop: Platform.select({ ios: 10, android: 50, default: 50 }),
    paddingHorizontal: 24,
  },
  hero: {
    gap: 12,
    marginTop: 12,
  },
  sectionTitle: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  detail: {
    color: colors.textMuted,
    lineHeight: 22,
    fontSize: 15,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchInputWrap: {
    flex: 1,
  },
  searchInput: {
    flex: 1,
    height: 56,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  searchButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  errorText: {
    marginTop: 12,
    color: colors.danger,
    lineHeight: 20,
    fontWeight: "600",
    fontSize: 14,
  },
});
