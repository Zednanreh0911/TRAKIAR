import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function AppHeroHeader({ title, subtitle, iconName = 'map-marker-radius-outline' }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <MaterialCommunityIcons name={iconName} size={17} color={colors.primary} />
        <Text style={styles.badgeText}>Trakiar</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 21,
    fontSize: 15,
  },
});
