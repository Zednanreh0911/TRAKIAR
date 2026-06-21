import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  iconName,
  iconOnly = false,
  style,
  labelStyle,
}) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        iconOnly && styles.iconOnly,
        isPrimary ? styles.primary : styles.secondary,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.surface : colors.primary} />
      ) : (
        <>
          {!!iconName && (
            <MaterialCommunityIcons
              name={iconName}
              size={18}
              color={isPrimary ? colors.surface : colors.primaryDark}
              style={styles.icon}
            />
          )}
          {!iconOnly && (
            <Text
              style={[
                styles.label,
                isPrimary ? styles.labelPrimary : styles.labelSecondary,
                labelStyle,
              ]}
            >
              {title}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  iconOnly: {
    paddingHorizontal: 0,
    minWidth: 56,
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  secondary: {
    backgroundColor: colors.surfaceSoft,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  label: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  labelPrimary: {
    color: colors.surface,
  },
  labelSecondary: {
    color: colors.text,
  },
  icon: {
    marginRight: 2,
  },
});
