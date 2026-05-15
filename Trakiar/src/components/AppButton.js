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
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
  },
  iconOnly: {
    paddingHorizontal: 0,
    minWidth: 44,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  label: {
    fontWeight: '700',
    fontSize: 15,
  },
  labelPrimary: {
    color: colors.surface,
  },
  labelSecondary: {
    color: colors.primaryDark,
  },
  icon: {
    marginRight: 2,
  },
});
