import { useEffect, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function AccordionSection({
  title,
  subtitle,
  headerContent,
  defaultExpanded = false,
  disabled = false,
  chevronColor = colors.textMuted,
  iconSize = 22,
  containerStyle,
  headerStyle,
  contentStyle,
  children,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const toggle = () => {
    if (disabled) {
      return;
    }

    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });

    setExpanded((prev) => !prev);
  };

  return (
    <View style={containerStyle}>
      <Pressable style={[styles.header, headerStyle]} onPress={toggle} disabled={disabled}>
        <View style={styles.headerText}>
          {headerContent || (
            <>
              {!!title && <Text style={styles.title}>{title}</Text>}
              {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </>
          )}
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={iconSize}
          color={chevronColor}
        />
      </Pressable>
      {expanded ? <View style={contentStyle}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 4,
  },
});
