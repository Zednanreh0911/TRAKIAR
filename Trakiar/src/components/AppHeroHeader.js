import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function AppHeroHeader({ title, subtitle, iconName = 'map-marker-radius-outline', onBack }) {
  return (
    <View style={styles.wrap}>
      {onBack && (
        <Pressable onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primaryDark} />
        </Pressable>
      )}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.titleAccent} />
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  titleAccent: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  title: {
    color: colors.primaryDark,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 24,
    fontSize: 16,
  },
});
