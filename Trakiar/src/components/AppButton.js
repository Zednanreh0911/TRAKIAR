import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

export default function AppButton({ title, onPress, variant = 'primary', loading = false, disabled = false }) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: '#fff',
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  label: {
    fontWeight: '700',
    fontSize: 15,
  },
  labelPrimary: {
    color: '#fff',
  },
  labelSecondary: {
    color: colors.primary,
  },
});
