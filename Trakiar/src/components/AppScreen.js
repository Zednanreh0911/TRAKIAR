import { SafeAreaView, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export default function AppScreen({
  children,
  backgroundColor = colors.background,
  containerStyle,
  safeAreaStyle,
}) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }, safeAreaStyle]}>
      <View style={[styles.container, { backgroundColor }, containerStyle]}>{children}</View>
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
