import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppCard from '../components/AppCard';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const managerModules = [
  {
    key: 'people',
    title: 'Gestión de personas',
    description: 'Promueve usuarios a choferes usando correo y cédula.',
    icon: 'account-group',
    route: 'PeopleManagement',
  },
  {
    key: 'units',
    title: 'Gestión de unidades',
    description: 'Crea unidades y asígnalas a choferes en dos pasos claros.',
    icon: 'bus-multiple',
    route: 'UnitsManagement',
  },
  {
    key: 'routes',
    title: 'Gestión de rutas',
    description: 'Administra rutas: crear, editar y eliminar.',
    icon: 'map-marker-path',
    route: 'RoutesManagement',
  },
  {
    key: 'live-routes',
    title: 'Rutas activas en vivo',
    description: 'Monitorea en tiempo real las rutas que están enviando ubicación.',
    icon: 'access-point-network',
    route: 'ActiveRoutesLive',
  },
  {
    key: 'stats',
    title: 'Estadísticas operativas',
    description: 'KPIs de disponibilidad, asignaciones y cobertura de rutas.',
    icon: 'chart-areaspline',
    route: 'ManagerStats',
  },
  {
    key: 'pdf-reports',
    title: 'Reportes PDF',
    description: 'Genera reportes en PDF con datos operativos y de rutas.',
    icon: 'file-pdf-box',
    route: 'PdfReports',
  },
];
import AppHeroHeader from '../components/AppHeroHeader';

export default function ManagerToolsScreen({ navigation }) {
  const { user } = useAuth();

  if (user?.rol !== 'gerente') {
    return (
      <AppScreen>
        <View style={styles.deniedWrap}>
          <Text style={styles.deniedTitle}>Acceso restringido</Text>
          <Text style={styles.deniedText}>
            Esta sección es exclusiva para usuarios con rol gerente.
          </Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeroHeader
          title="Gestión operativa"
          subtitle="Selecciona un módulo para administrar personas, unidades o rutas."
          onBack={() => navigation.goBack()}
        />

        {managerModules.map((module) => (
          <Pressable
            key={module.key}
            style={({ pressed }) => [styles.modulePressable, pressed && styles.modulePressed]}
            onPress={() => navigation.navigate(module.route)}
          >
            <AppCard>
              <View style={styles.moduleRow}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name={module.icon} size={24} color={colors.primary} />
                </View>
                <View style={styles.moduleContent}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleDescription}>{module.description}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
              </View>
            </AppCard>
          </Pressable>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 40,
    paddingTop: Platform.select({ ios: 10, android: 50, default: 50 }),
    paddingHorizontal: 24,
  },
  modulePressable: {
    borderRadius: 16,
  },
  modulePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  moduleContent: {
    flex: 1,
    gap: 4,
  },
  moduleTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  moduleDescription: {
    color: colors.textMuted,
    lineHeight: 22,
    fontSize: 14,
  },
  deniedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  deniedTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  deniedText: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
