import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppHeroHeader from '../components/AppHeroHeader';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ChangeStatusScreen({ navigation }) {
  const { user, toggleMyStatus } = useAuth();
  const tipoLinea = user?.tipoLinea || 'natural';
  const currentLabel = tipoLinea === 'estudiantes' ? 'Estudiante' : 'Natural';
  const nextLabel = tipoLinea === 'estudiantes' ? 'Natural' : 'Estudiante';

  const onToggle = async () => {
    try {
      await toggleMyStatus();
      Alert.alert('Listo', `Tu estatus cambió a ${nextLabel.toLowerCase()}.`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.error || 'No se pudo cambiar el estatus');
    }
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeroHeader
          title="Cambiar estatus"
          subtitle="Alterna tu tipo de usuario entre natural y estudiante cuando lo necesites."
        />

        <AppCard style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, styles.iconWrapAccent]}>
              <MaterialCommunityIcons name="account-switch" size={22} color={colors.warning} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Estatus actual</Text>
              <Text style={styles.subtitle}>Actualmente estás como {currentLabel.toLowerCase()}.</Text>
            </View>
          </View>

          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>Nuevo estatus</Text>
            <Text style={styles.previewValue}>{nextLabel}</Text>
          </View>

          <AppButton
            title={`Cambiar a ${nextLabel.toLowerCase()}`}
            onPress={onToggle}
            iconName="swap-horizontal"
          />
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 24,
    paddingTop: Platform.select({ ios: 1, android: 50, default: 50 }),
  },
  card: {
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconWrapAccent: {
    backgroundColor: '#EC83051A',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 18,
  },
  previewBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  previewLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  previewValue: {
    color: colors.warning,
    fontSize: 18,
    fontWeight: '800',
  },
});
