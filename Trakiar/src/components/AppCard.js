import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export default function AppCard({ children, style, variant = 'default' }) {
  return <View style={[styles.card, variant === 'soft' && styles.cardSoft, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardSoft: {
    backgroundColor: colors.surfaceSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
});
