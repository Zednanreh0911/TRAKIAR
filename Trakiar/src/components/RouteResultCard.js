import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import AppButton from './AppButton';
import AppCard from './AppCard';

export default function RouteResultCard({ routeItem, onPress, isFavorite = false, onToggleFavorite }) {
  return (
    <AppCard>
      <View style={styles.titleRow}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="map-marker-path" size={18} color={colors.warning} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.routeTitle}>{routeItem?.nombre || 'Ruta sin nombre'}</Text>
          <Text style={styles.routeMeta}>Línea: {routeItem?.linea_nombre || 'N/D'}</Text>
        </View>

        {onToggleFavorite ? (
          <Pressable
            onPress={onToggleFavorite}
            style={({ pressed }) => [styles.favoriteButton, pressed && styles.favoritePressed]}
          >
            <MaterialCommunityIcons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={19}
              color={isFavorite ? colors.warning : colors.textLight}
            />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.routeDescription}>{routeItem?.descripcion || 'Sin descripción registrada.'}</Text>

      <View style={styles.routeActionWrap}>
        <AppButton title="Ver ruta en el mapa" variant="secondary" iconName="navigation" onPress={onPress} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  favoritePressed: {
    opacity: 0.72,
  },
  routeTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  routeMeta: {
    color: colors.warning,
    fontWeight: '700',
    fontSize: 14,
  },
  routeDescription: {
    color: colors.textMuted,
    lineHeight: 22,
    fontSize: 15,
  },
  routeActionWrap: {
    marginTop: 16,
  },
});
