import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function AppDropdown({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Selecciona una opción',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const selected = options.find((opt) => String(opt.value) === String(value));

  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        style={[styles.trigger, disabled && styles.disabled]}
        onPress={() => !disabled && setOpen((s) => !s)}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#5E6A7D" />
      </Pressable>

      {open && !disabled && (
        <View style={styles.menu}>
          {options.length === 0 ? (
            <Text style={styles.emptyText}>No hay opciones disponibles.</Text>
          ) : (
            options.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <Pressable
                  key={String(opt.value)}
                  style={[styles.item, idx === options.length - 1 && styles.lastItem, isSelected && styles.itemActive]}
                  onPress={() => {
                    onChange?.(String(opt.value));
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>{opt.label}</Text>
                  {isSelected && <MaterialCommunityIcons name="check" size={16} color="#2F6BFF" />}
                </Pressable>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#3A4760',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 6,
  },
  trigger: {
    borderWidth: 1,
    borderColor: '#DFE6F4',
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FBFCFF',
    gap: 10,
  },
  disabled: {
    opacity: 0.65,
  },
  triggerText: {
    color: '#1A2A4A',
    fontWeight: '600',
    flex: 1,
  },
  placeholder: {
    color: '#8c96a4',
    fontWeight: '500',
  },
  menu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#DFE6F4',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  emptyText: {
    color: '#8c96a4',
    padding: 12,
    fontSize: 13,
  },
  item: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemActive: {
    backgroundColor: '#F3F7FF',
  },
  itemText: {
    color: '#1A2A4A',
    fontSize: 14,
    flex: 1,
  },
  itemTextActive: {
    color: '#2F6BFF',
    fontWeight: '700',
  },
});
