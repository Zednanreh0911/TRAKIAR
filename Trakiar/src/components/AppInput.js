import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';

export default function AppInput({ label, ...props }) {
  return (
    <View style={styles.wrapper}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
  },
});
