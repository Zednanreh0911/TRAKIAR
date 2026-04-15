import { SafeAreaView, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export default function AppScreen({ children }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
});
