import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function RouteSummaryScreen({ summary, onBack }) {
  const syncOk = summary?.syncStatus === 'completed';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resumen de ruta</Text>
      <Text style={styles.subtitle}>{summary?.routeName || 'Ruta finalizada'}</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="clock-outline" size={18} color="#2F6BFF" />
          <Text style={styles.label}>Duración</Text>
          <Text style={styles.value}>{summary?.durationText || '00:00:00'}</Text>
        </View>

        <View style={styles.row}>
          <MaterialCommunityIcons name="map-marker-path" size={18} color="#2F6BFF" />
          <Text style={styles.label}>Puntos tomados</Text>
          <Text style={styles.value}>{summary?.totalPoints ?? 0}</Text>
        </View>

        <View style={styles.row}>
          <MaterialCommunityIcons name="speedometer" size={18} color="#2F6BFF" />
          <Text style={styles.label}>Velocidad promedio</Text>
          <Text style={styles.value}>{summary?.averageSpeedKmh ?? 0} km/h</Text>
        </View>

        <View style={[styles.syncBadge, syncOk ? styles.syncOk : styles.syncPending]}>
          <MaterialCommunityIcons
            name={syncOk ? 'check-circle' : 'alert-circle'}
            size={16}
            color={syncOk ? '#0C7A43' : '#A76700'}
          />
          <Text style={[styles.syncText, syncOk ? styles.syncTextOk : styles.syncTextPending]}>
            {syncOk ? 'Sincronización completada' : 'Sincronización pendiente'}
          </Text>
        </View>

        {summary?.syncMessage ? <Text style={styles.syncMessage}>{summary.syncMessage}</Text> : null}
      </View>

      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Volver al panel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FC',
    paddingHorizontal: 22,
    paddingTop: 52,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A2A4A',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 14,
    color: '#5E6A7D',
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#E4EAF7',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: '#3A4760',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  value: {
    color: '#1A2A4A',
    fontWeight: '800',
    fontSize: 14,
  },
  syncBadge: {
    marginTop: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  syncOk: {
    backgroundColor: '#E8F8F0',
  },
  syncPending: {
    backgroundColor: '#FFF4E5',
  },
  syncText: {
    fontWeight: '700',
    fontSize: 12,
  },
  syncTextOk: {
    color: '#0C7A43',
  },
  syncTextPending: {
    color: '#A76700',
  },
  syncMessage: {
    color: '#5E6A7D',
    fontSize: 12,
    lineHeight: 18,
  },
  backButton: {
    marginTop: 16,
    backgroundColor: '#2F6BFF',
    borderRadius: 12,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
