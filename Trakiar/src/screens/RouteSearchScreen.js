import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import AppCard from "../components/AppCard";
import AppInput from "../components/AppInput";
import AppScreen from "../components/AppScreen";
import RouteResultCard from "../components/RouteResultCard";
import { useAuth } from "../context/AuthContext";
import { searchRoutes } from "../services/apiService";
import { getSearchLocation } from "../services/locationService";
import { colors } from "../theme/colors";
import { enrichRoutesWithEta } from "../utils/routeEta";
import { getErrorText } from "../utils/error";
import { useState } from "react";

export default function RouteSearchScreen() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [routes, setRoutes] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const normalized = query.trim();

    if (normalized.length < 2) {
      setErrorText("Escribe al menos 2 caracteres para buscar rutas.");
      return;
    }

    try {
      setLoading(true);
      setErrorText("");
      const searchLocation = await getSearchLocation();
      const response = await searchRoutes(token, normalized, searchLocation);
      setRoutes(enrichRoutesWithEta(response?.rutas || []));
      setSearched(true);
    } catch (error) {
      setRoutes([]);
      setSearched(true);
      setErrorText(getErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.title}>Buscar rutas</Text>
          <Text style={styles.subtitle}>
            Busca por punto clave para ver las rutas asociadas y el ETA local.
          </Text>
        </View>

        <AppCard>
          <View style={styles.searchGroup}>
            <AppInput
              label="¿A qué punto clave vas?"
              value={query}
              onChangeText={setQuery}
              placeholder="Escribe un punto clave..."
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <AppButton
              title={loading ? "Buscando..." : "Buscar rutas"}
              onPress={handleSearch}
              loading={loading}
            />
          </View>
          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}
        </AppCard>

        {searched && routes.length === 0 && !loading ? (
          <AppCard>
            <Text style={styles.emptyTitle}>Sin coincidencias</Text>
            <Text style={styles.emptyText}>
              Intenta con otro punto clave, otro nombre de ruta o una variación
              del punto.
            </Text>
          </AppCard>
        ) : null}

        {routes.map((route) => (
          <RouteResultCard key={String(route.id)} routeItem={route} />
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
  hero: {
    gap: 6,
    marginTop: 6,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  searchGroup: {
    gap: 10,
  },
  errorText: {
    marginTop: 8,
    color: colors.danger,
    lineHeight: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
