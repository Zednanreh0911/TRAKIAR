import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export default function AppCard({ children }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
});
