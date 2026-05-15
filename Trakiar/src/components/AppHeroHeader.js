import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function AppHeroHeader({ title, subtitle, iconName = 'map-marker-radius-outline' }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.titleAccent} />
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  titleAccent: {
    width: 44,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.warning,
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
