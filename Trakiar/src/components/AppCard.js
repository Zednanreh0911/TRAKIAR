import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export default function AppCard({ children, style, variant = 'default' }) {
  return <View style={[styles.card, variant === 'soft' && styles.cardSoft, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardSoft: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
  },
});
