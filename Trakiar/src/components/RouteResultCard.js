import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import AppButton from "./AppButton";
import AppCard from "./AppCard";

export default function RouteResultCard({
  routeItem,
  onPress,
  isFavorite = false,
  onToggleFavorite,
}) {
  const pointLabel =
    routeItem?.punto_clave?.nombre || routeItem?.punto_clave_nombre;
  const etaText = routeItem?.etaText || routeItem?.eta_text;
  const distanceText = routeItem?.distanciaText || routeItem?.distancia_text;
  const userDistanceKm =
    routeItem?.distancia_usuario_km ?? routeItem?.distanciaUsuarioKm;
  const userDistanceText =
    Number.isFinite(Number(userDistanceKm)) && Number(userDistanceKm) >= 0
      ? Number(userDistanceKm) < 1
        ? `${Math.max(1, Math.round(Number(userDistanceKm) * 1000))} m`
        : `${Number(userDistanceKm).toFixed(2)} km`
      : null;
  const unitLabel =
    routeItem?.unidadMasRapida?.id_unidad ||
    routeItem?.unidad_mas_rapida?.id_unidad;
  const liveRoute = routeItem?.ruta_en_vivo || null;
  const isLive = Boolean(
    routeItem?.tieneTiempoReal || routeItem?.tiene_tiempo_real || liveRoute,
  );
  const liveDriverName =
    liveRoute?.chofer?.nombre ||
    routeItem?.chofer?.nombre ||
    routeItem?.chofer_nombre;
  const assignedUnitLabel =
    liveRoute?.unidadIdentificador ||
    (liveRoute?.idUnidad != null ? `Unidad ${liveRoute.idUnidad}` : null);

  return (
    <AppCard>
      <View style={styles.titleRow}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name="map-marker-path"
            size={18}
            color={colors.warning}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.routeTitle}>
            {routeItem?.nombre || "Ruta sin nombre"}
          </Text>
          <Text style={styles.routeMeta}>
            Línea: {routeItem?.linea_nombre || "N/D"}
          </Text>
          {pointLabel ? (
            <Text style={styles.pointMeta}>Punto clave: {pointLabel}</Text>
          ) : null}
          {isLive ? <Text style={styles.liveMeta}>En vivo</Text> : null}
          {isLive ? (
            <View style={styles.liveInfoWrap}>
              {liveDriverName ? (
                <Text style={styles.liveInfoText}>
                  Chofer: {liveDriverName}
                </Text>
              ) : null}
              {assignedUnitLabel ? (
                <Text style={styles.liveInfoText}>
                  Unidad asignada: {assignedUnitLabel}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {onToggleFavorite ? (
          <Pressable
            onPress={onToggleFavorite}
            style={({ pressed }) => [
              styles.favoriteButton,
              pressed && styles.favoritePressed,
            ]}
          >
            <MaterialCommunityIcons
              name={isFavorite ? "heart" : "heart-outline"}
              size={19}
              color={isFavorite ? colors.warning : colors.textLight}
            />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.routeDescription}>
        {routeItem?.descripcion || "Sin descripción registrada."}
      </Text>

      {etaText ? (
        <View style={styles.etaWrap}>
          <View style={styles.etaBadge}>
            <MaterialCommunityIcons
              name="clock-fast"
              size={16}
              color={colors.warning}
            />
            <Text style={styles.etaText}>ETA local: {etaText}</Text>
          </View>
          {unitLabel ? (
            <Text style={styles.etaHint}>
              Unidad {unitLabel} llegará primero
            </Text>
          ) : null}
        </View>
      ) : null}

      {distanceText ? (
        <Text style={styles.distanceText}>
          Distancia al punto clave: {distanceText}
        </Text>
      ) : null}

      {userDistanceText ? (
        <Text style={styles.userDistanceText}>
          Cerca de ti: {userDistanceText}
        </Text>
      ) : null}

      <View style={styles.routeActionWrap}>
        <AppButton
          title="Ver ruta en el mapa"
          variant="secondary"
          iconName="navigation"
          onPress={onPress}
        />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
  },
  favoritePressed: {
    opacity: 0.72,
  },
  routeTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  routeMeta: {
    color: colors.warning,
    fontWeight: "700",
    fontSize: 14,
  },
  pointMeta: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  liveMeta: {
    color: colors.success || "#22C55E",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  liveInfoWrap: {
    marginTop: 2,
    gap: 2,
  },
  liveInfoText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  routeDescription: {
    color: colors.textMuted,
    lineHeight: 22,
    fontSize: 15,
  },
  etaWrap: {
    marginTop: 14,
    gap: 6,
  },
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
  },
  etaText: {
    color: colors.text,
    fontWeight: "800",
  },
  etaHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  distanceText: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  userDistanceText: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  routeActionWrap: {
    marginTop: 16,
  },
});
