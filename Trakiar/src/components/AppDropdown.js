import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';

export default function AppDropdown({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Selecciona una opción',
  loading = false,
  disabled = false,
  emptyText = 'No hay opciones disponibles.',
  leftIconName = 'chevron-right',
  leftIconColor = colors.primary,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [renderOptions, setRenderOptions] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value]
  );

  useEffect(() => {
    if (isOpen) {
      setRenderOptions(true);
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setRenderOptions(false);
      }
    });
  }, [dropdownAnim, isOpen]);

  const dropdownTranslateY = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  const dropdownScale = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  const chevronRotate = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const currentIconName = selectedOption?.leftIconName || leftIconName;
  const currentIconColor = selectedOption?.leftIconColor || leftIconColor;
  const displayLabel = loading ? 'Cargando...' : selectedOption?.label || placeholder;

  const handleToggle = () => {
    if (disabled || loading) {
      return;
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (nextValue) => {
    if (onChange) {
      onChange(String(nextValue));
    }
    setIsOpen(false);
  };

  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.select, isOpen && styles.selectOpen, disabled && styles.selectDisabled]}
        onPress={handleToggle}
        activeOpacity={0.8}
      >
        <View style={styles.selectInner}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name={currentIconName} size={16} color={currentIconColor} />
          </View>
          <Text style={[styles.selectText, !selectedOption && !loading && styles.placeholderText]}>{displayLabel}</Text>
        </View>

        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      {renderOptions && (
        <Animated.View
          style={[
            styles.options,
            {
              opacity: dropdownAnim,
              transform: [{ translateY: dropdownTranslateY }, { scaleY: dropdownScale }],
            },
          ]}
        >
          {options.length === 0 ? (
            <View style={styles.emptyOption}>
              <Text style={styles.emptyOptionText}>{emptyText}</Text>
            </View>
          ) : (
            options.map((option, index) => {
              const isSelected = String(option.value) === String(value);
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[
                    styles.option,
                    index === options.length - 1 && styles.optionLast,
                    isSelected && styles.optionSelected,
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.85}
                >
                  <View style={styles.optionLeft}>
                    {!!option.leftIconName && (
                      <MaterialCommunityIcons
                        name={option.leftIconName}
                        size={16}
                        color={option.leftIconColor || colors.textMuted}
                      />
                    )}
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.label}</Text>
                  </View>
                  {isSelected && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, marginBottom: 6, fontSize: 13, fontWeight: '600' },
  select: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E6E9F2',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectOpen: { borderColor: '#C9D9FF', backgroundColor: '#FDFEFF' },
  selectDisabled: { opacity: 0.65 },
  selectInner: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  placeholderText: { color: colors.textMuted, fontWeight: '500' },
  options: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DCE5FA',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLast: { borderBottomWidth: 0 },
  optionSelected: { backgroundColor: '#F4F8FF' },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 10 },
  optionText: { color: colors.text, fontSize: 15 },
  optionTextSelected: { color: colors.primary, fontWeight: '700' },
  emptyOption: { paddingVertical: 12, paddingHorizontal: 12 },
  emptyOptionText: { color: colors.textMuted, fontSize: 14 },
});
