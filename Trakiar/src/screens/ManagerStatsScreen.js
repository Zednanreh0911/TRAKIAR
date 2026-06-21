import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppCard from '../components/AppCard';
import AppHeroHeader from '../components/AppHeroHeader';
import AppScreen from '../components/AppScreen';
import InlineFeedback from '../components/InlineFeedback';
import { useAuth } from '../context/AuthContext';
import { getManagerStats } from '../services/apiService';
import { colors } from '../theme/colors';
import { getErrorText } from '../utils/error';

const formatPct = (value) => (Number.isFinite(value) ? `${value}%` : 'N/D');

const formatSpeed = (value) => (Number.isFinite(value) ? `${value.toFixed(1)} km/h` : 'N/D');

export default function ManagerStatsScreen({ navigation }) {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await getManagerStats(token);
      setStats(response);
      setLastUpdated(new Date());
      setFeedback(null);
    } catch (error) {
      setFeedback({ tone: 'error', message: getErrorText(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.rol === 'gerente') {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.rol]);

  const summary = useMemo(() => {
    const units = stats?.units || {};
    const drivers = stats?.drivers || {};
    const routes = stats?.routes || {};
    const coverage = stats?.coverage || {};
    const eta = stats?.etaQuality || {};
    const inactiveSummary = stats?.inactiveSummary || {};

    return {
      units,
      drivers,
      routes,
      coverage,
      eta,
      inactiveSummary,
    };
  }, [stats]);

  if (user?.rol !== 'gerente') {
    return (
      <AppScreen>
        <View style={styles.deniedWrap}>
          <Text style={styles.deniedTitle}>Acceso restringido</Text>
          <Text style={styles.deniedText}>Esta sección es exclusiva para usuarios con rol gerente.</Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeroHeader
          title="Estadísticas operativas"
          subtitle="Indicadores clave para la gestión diaria de la línea."
          onBack={() => navigation.goBack()}
        />

        {lastUpdated ? (
          <Text style={styles.updatedText}>Actualizado: {lastUpdated.toLocaleTimeString()}</Text>
        ) : null}

        {loading && !stats ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}

        <InlineFeedback message={feedback?.message} tone={feedback?.tone} />

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="bus-clock" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Unidades activas vs. inactivas</Text>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{summary.units.active ?? 0}</Text>
              <Text style={styles.metricLabel}>Activas</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{summary.units.inactive ?? 0}</Text>
              <Text style={styles.metricLabel}>Inactivas</Text>
            </View>
          </View>
          <Text style={styles.metricHint}>Total: {summary.units.total ?? 0} unidades</Text>
        </AppCard>

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="account-check-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Choferes asignados</Text>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{summary.drivers.assigned ?? 0}</Text>
              <Text style={styles.metricLabel}>Con chofer</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{summary.drivers.unassigned ?? 0}</Text>
              <Text style={styles.metricLabel}>Sin chofer</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{formatPct(summary.drivers.assignedPct)}</Text>
              <Text style={styles.metricLabel}>Cobertura</Text>
            </View>
          </View>
        </AppCard>

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Cobertura de rutas</Text>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{summary.routes.total ?? 0}</Text>
              <Text style={styles.metricLabel}>Rutas</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{summary.coverage.activeUnits ?? 0}</Text>
              <Text style={styles.metricLabel}>Unidades activas</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{formatPct(summary.coverage.coveragePct)}</Text>
              <Text style={styles.metricLabel}>Cobertura</Text>
            </View>
          </View>
          <Text style={styles.metricHint}>Cobertura aproximada segun unidades activas.</Text>
        </AppCard>

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="timer-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Calidad de ETA</Text>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{formatPct(summary.eta.recentPct)}</Text>
              <Text style={styles.metricLabel}>Actualizaciones recientes</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{formatSpeed(summary.eta.avgSpeedKmh)}</Text>
              <Text style={styles.metricLabel}>Velocidad prom.</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{summary.eta.sampleSize ?? 0}</Text>
              <Text style={styles.metricLabel}>Unidades con datos</Text>
            </View>
          </View>
          <Text style={styles.metricHint}>Basado en ubicaciones de las ultimas 24h.</Text>
        </AppCard>

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="bus-alert" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Unidades inactivas</Text>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{summary.inactiveSummary.inactiveCount ?? 0}</Text>
              <Text style={styles.metricLabel}>Inactivas</Text>
            </View>
          </View>
          <Text style={styles.metricHint}>Estas unidades requieren revision antes de reactivarse.</Text>
        </AppCard>
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
  updatedText: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  loadingWrap: { paddingVertical: 16, alignItems: 'center' },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: colors.primaryDark, fontWeight: '800', fontSize: 16, letterSpacing: -0.2 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  metricBlock: { flex: 1, alignItems: 'center', gap: 6 },
  metricValue: { color: colors.primaryDark, fontWeight: '800', fontSize: 22 },
  metricLabel: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 16 },
  metricHint: { color: colors.textMuted, fontSize: 13, marginTop: 10, lineHeight: 18 },
  deniedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 8 },
  deniedTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  deniedText: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
