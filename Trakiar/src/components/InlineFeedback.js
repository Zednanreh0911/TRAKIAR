import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const toneStyles = {
  success: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    textColor: colors.primaryDark,
  },
  error: {
    backgroundColor: 'rgba(236, 131, 5, 0.12)',
    borderColor: colors.danger,
    textColor: colors.danger,
  },
  info: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    textColor: colors.text,
  },
};

export default function InlineFeedback({ message, tone = 'info', style }) {
  if (!message) {
    return null;
  }

  const resolved = toneStyles[tone] || toneStyles.info;

  return (
    <View style={[styles.wrap, { backgroundColor: resolved.backgroundColor, borderColor: resolved.borderColor }, style]}>
      <Text style={[styles.text, { color: resolved.textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
