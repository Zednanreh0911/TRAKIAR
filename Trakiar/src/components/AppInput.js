import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function AppInput({
  label,
  rightIconName,
  onPressRightIcon,
  rightIconColor = colors.textMuted,
  rightIconSize = 18,
  ...props
}) {
  const hasRightIcon = !!rightIconName;
  const RightIconWrapper = onPressRightIcon ? Pressable : View;

  return (
    <View style={styles.wrapper}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          {...props}
          style={[styles.input, hasRightIcon && styles.inputWithIcon, props.style]}
        />
        {hasRightIcon && (
          <RightIconWrapper
            accessibilityRole={onPressRightIcon ? 'button' : undefined}
            onPress={onPressRightIcon}
            style={styles.rightIcon}
          >
            <MaterialCommunityIcons name={rightIconName} size={rightIconSize} color={rightIconColor} />
          </RightIconWrapper>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: colors.text,
    fontSize: 16,
  },
  inputWithIcon: {
    paddingRight: 44,
  },
  rightIcon: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
