import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import AppDropdown from '../components/AppDropdown';
import { useAuth } from '../context/AuthContext';
import { getDriverRoutes, registerDriverLocationsBatch } from '../services/apiService';
import { createRealtimeSocket, sendDriverRealtimeLocation } from '../services/realtimeService';
import RouteSummaryScreen from './RouteSummaryScreen';
import { getErrorText } from '../utils/error';

const TRACK_INTERVAL_MS = 5000;
const BUFFER_STORAGE_PREFIX = '@trakiar:driver-points:';

const getRouteBufferKey = (routeId) => `${BUFFER_STORAGE_PREFIX}${routeId}`;

const formatDuration = (durationMs) => {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getRouteSummary = (points, startedAtMs, finishedAtMs) => {
  const validSpeeds = points
    .map((point) => Number(point?.velocidadKmh))
    .filter((speed) => Number.isFinite(speed) && speed >= 0);

  const avgSpeed =
    validSpeeds.length > 0 ? Number((validSpeeds.reduce((acc, speed) => acc + speed, 0) / validSpeeds.length).toFixed(2)) : 0;

  return {
    durationText: formatDuration((startedAtMs || finishedAtMs) ? finishedAtMs - (startedAtMs || finishedAtMs) : 0),
    totalPoints: points.length,
    averageSpeedKmh: avgSpeed,
  };
};

export default function DriverHomeScreen() {
  const { token, user, signOut } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [trackText, setTrackText] = useState('Selecciona una ruta y presiona iniciar ruta.');
  const [bufferedCount, setBufferedCount] = useState(0);
  const [liveStatus, setLiveStatus] = useState('idle');
  const [lastCaptureText, setLastCaptureText] = useState('');
  const [routeSummary, setRouteSummary] = useState(null);
  const [finalizingRoute, setFinalizingRoute] = useState(false);
  const [syncRetrying, setSyncRetrying] = useState(false);
  const locationIntervalRef = useRef(null);
  const activeRouteRef = useRef(null);
  const routeStartedAtRef = useRef(null);
  const captureInProgressRef = useRef(false);
  const holdPressedRef = useRef(false);
  const finalizingRouteRef = useRef(false);
  const syncRetryInProgressRef = useRef(false);
  const syncRetryIntervalRef = useRef(null);
  const pendingSyncRef = useRef(null);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdAnimRef = useRef(null);
  const realtimeSocketRef = useRef(null);

  const unidadLabel = user?.unidad?.identificador
    ? `${user.unidad.identificador}${user?.unidad?.estado ? ` (${user.unidad.estado})` : ''}`
    : null;

  const routeOptions = useMemo(
    () =>
      routes.map((route) => ({
        value: String(route.id),
        label: route.nombre,
      })),
    [routes]
  );

  const appendPointToBuffer = async (routeId, point) => {
    const bufferKey = getRouteBufferKey(routeId);
    const previousRaw = await AsyncStorage.getItem(bufferKey);
    const previousPoints = previousRaw ? JSON.parse(previousRaw) : [];
    const updatedPoints = [...previousPoints, { ...point, synced: false }];

    await AsyncStorage.setItem(bufferKey, JSON.stringify(updatedPoints));
    setBufferedCount(updatedPoints.length);
    return updatedPoints.length;
  };

  const buildPendingPayload = (points) =>
    points
      .filter((point) => !point?.synced)
      .map((point) => ({
        latitud: point.latitud,
        longitud: point.longitud,
        velocidadKmh: point.velocidadKmh,
        capturedAt: point.capturedAt,
      }));

  const clearSyncRetryInterval = () => {
    if (syncRetryIntervalRef.current) {
      clearInterval(syncRetryIntervalRef.current);
      syncRetryIntervalRef.current = null;
    }
  };

  const attemptPendingSync = async () => {
    if (syncRetryInProgressRef.current) {
      return;
    }

    const pending = pendingSyncRef.current;
    if (!pending?.routeId || !pending?.bufferKey || !token) {
      return;
    }

    syncRetryInProgressRef.current = true;
    setSyncRetrying(true);
    setRouteSummary((prev) => (prev ? { ...prev, syncRetrying: true } : prev));

    try {
      const raw = await AsyncStorage.getItem(pending.bufferKey);
      const points = raw ? JSON.parse(raw) : [];
      const pendingPayload = buildPendingPayload(points);

      if (pendingPayload.length === 0) {
        await AsyncStorage.removeItem(pending.bufferKey);
        setBufferedCount(0);
        setRouteSummary((prev) =>
          prev
            ? {
                ...prev,
                syncStatus: 'completed',
                syncMessage: 'No había puntos pendientes por sincronizar.',
                syncRetrying: false,
              }
            : prev
        );
        pendingSyncRef.current = null;
        clearSyncRetryInterval();
        return;
      }

      await registerDriverLocationsBatch(token, {
        idRuta: pending.routeId,
        puntos: pendingPayload,
      });

      await AsyncStorage.removeItem(pending.bufferKey);
      setBufferedCount(0);
      setRouteSummary((prev) =>
        prev
          ? {
              ...prev,
              syncStatus: 'completed',
              syncMessage: `Se enviaron ${pendingPayload.length} puntos pendientes correctamente.`,
              syncRetrying: false,
            }
          : prev
      );
      pendingSyncRef.current = null;
      clearSyncRetryInterval();
    } catch (error) {
      setRouteSummary((prev) =>
        prev
          ? {
              ...prev,
              syncStatus: 'pending',
              syncMessage: 'No se pudo sincronizar; se reintentara automaticamente cuando haya conexion.',
              syncRetrying: false,
            }
          : prev
      );
    } finally {
      syncRetryInProgressRef.current = false;
      setSyncRetrying(false);
      setRouteSummary((prev) => (prev ? { ...prev, syncRetrying: false } : prev));
    }
  };

  const ensureSyncRetryInterval = () => {
    if (syncRetryIntervalRef.current) {
      return;
    }

    syncRetryIntervalRef.current = setInterval(() => {
      attemptPendingSync();
    }, 20000);
  };


  const captureAndBufferLocation = async () => {
    if (captureInProgressRef.current) {
      return;
    }

    const routeId = activeRouteRef.current;
    if (!routeId) {
      return;
    }

    captureInProgressRef.current = true;
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const speedMs = location?.coords?.speed;
      const speedKmh = typeof speedMs === 'number' && speedMs > 0 ? Number((speedMs * 3.6).toFixed(2)) : null;

      const payload = {
        latitud: location.coords.latitude,
        longitud: location.coords.longitude,
        velocidadKmh: speedKmh,
        capturedAt: new Date().toISOString(),
      };

      const total = await appendPointToBuffer(routeId, payload);

      sendDriverRealtimeLocation(realtimeSocketRef.current, {
        idRuta: routeId,
        ...payload,
      });

      // La sincronizacion con la base de datos se realiza al finalizar la ruta.

      setLiveStatus('ok');
      setLastCaptureText(new Date().toLocaleTimeString());
      setTrackText(`Ruta en curso. Puntos guardados localmente: ${total}.`);
    } catch (error) {
      setLiveStatus('error');
      setTrackText(getErrorText(error, 'No se pudo capturar la ubicación en este momento.'));
    } finally {
      captureInProgressRef.current = false;
    }
  };

  const stopTracking = async () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }

    setTracking(false);
    captureInProgressRef.current = false;
    setLiveStatus('idle');

    const routeId = activeRouteRef.current;
    const startedAtMs = routeStartedAtRef.current;
    activeRouteRef.current = null;
    routeStartedAtRef.current = null;

    if (!routeId) {
      if (realtimeSocketRef.current) {
        realtimeSocketRef.current.close();
        realtimeSocketRef.current = null;
      }
      setTrackText('Ruta finalizada. Puedes seleccionar otra ruta para iniciar nuevamente.');
      return;
    }

    const bufferKey = getRouteBufferKey(routeId);

    try {
      const raw = await AsyncStorage.getItem(bufferKey);
      const points = raw ? JSON.parse(raw) : [];
      const pendingPoints = points.filter((point) => !point?.synced);
      const finishedAtMs = Date.now();
      const summary = getRouteSummary(points, startedAtMs, finishedAtMs);
      const currentRouteName = routes.find((route) => Number(route.id) === Number(routeId))?.nombre || `Ruta ${routeId}`;

      if (points.length === 0) {
        setTrackText('Ruta finalizada sin puntos capturados.');
        setBufferedCount(0);

        setRouteSummary({
          ...summary,
          routeName: currentRouteName,
          syncStatus: 'completed',
          syncMessage: 'No se capturaron puntos en esta ruta.',
        });
        return;
      }

      if (pendingPoints.length > 0) {
        const pendingPayload = buildPendingPayload(pendingPoints);

        setTrackText(`Finalizando ruta... enviando ${pendingPayload.length} puntos pendientes.`);
        await registerDriverLocationsBatch(token, {
          idRuta: routeId,
          puntos: pendingPayload,
        });
      }

      await AsyncStorage.removeItem(bufferKey);
      setBufferedCount(0);
      setTrackText(
        pendingPoints.length > 0
          ? `Ruta finalizada. Se enviaron ${pendingPoints.length} puntos correctamente.`
          : 'Ruta finalizada. Todos los puntos ya estaban sincronizados.'
      );

      setRouteSummary({
        ...summary,
        routeName: currentRouteName,
        syncStatus: 'completed',
        syncMessage:
          pendingPoints.length > 0
            ? `Se enviaron ${pendingPoints.length} puntos correctamente.`
            : 'Todos los puntos ya estaban sincronizados en tiempo real.',
      });
    } catch (error) {
      setTrackText(getErrorText(error, 'No se pudieron enviar los puntos. Quedaron guardados localmente.'));
      const finishedAtMs = Date.now();
      const raw = await AsyncStorage.getItem(bufferKey);
      const points = raw ? JSON.parse(raw) : [];
      const summary = getRouteSummary(points, startedAtMs, finishedAtMs);
      const currentRouteName = routes.find((route) => Number(route.id) === Number(routeId))?.nombre || `Ruta ${routeId}`;

      pendingSyncRef.current = { routeId, bufferKey };
      ensureSyncRetryInterval();

      setRouteSummary({
        ...summary,
        routeName: currentRouteName,
        syncStatus: 'pending',
        syncMessage: 'No se pudieron enviar al servidor; los puntos quedaron guardados para reintento.',
        syncRetrying: false,
      });
    } finally {
      if (realtimeSocketRef.current) {
        realtimeSocketRef.current.close();
        realtimeSocketRef.current = null;
      }
    }
  };

  const finalizeRouteFromHold = async () => {
    if (!tracking || finalizingRouteRef.current) {
      return;
    }

    finalizingRouteRef.current = true;
    setFinalizingRoute(true);

    try {
      await stopTracking();
    } finally {
      finalizingRouteRef.current = false;
      holdPressedRef.current = false;
      setFinalizingRoute(false);
      resetHoldAnimation();
    }
  };

  const startHoldAnimation = () => {
    if (!tracking || finalizingRouteRef.current) {
      return;
    }

    holdPressedRef.current = true;
    holdProgress.setValue(0);
    holdAnimRef.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: 3000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    holdAnimRef.current.start(({ finished }) => {
      if (finished && holdPressedRef.current) {
        finalizeRouteFromHold();
      }
    });
  };

  const resetHoldAnimation = () => {
    holdPressedRef.current = false;

    if (holdAnimRef.current) {
      holdAnimRef.current.stop();
    }

    Animated.timing(holdProgress, {
      toValue: 0,
      duration: 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const loadDriverRoutes = async () => {
    if (!token) {
      return;
    }

    try {
      setLoadingRoutes(true);
      const response = await getDriverRoutes(token);
      const fetchedRoutes = response?.rutas || [];
      setRoutes(fetchedRoutes);

      if (selectedRoute && !fetchedRoutes.some((route) => String(route.id) === selectedRoute)) {
        setSelectedRoute('');
      }
    } catch (error) {
      setTrackText(getErrorText(error, 'No se pudieron cargar las rutas de chofer.'));
    } finally {
      setLoadingRoutes(false);
    }
  };

  useEffect(() => {
    loadDriverRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }

      clearSyncRetryInterval();

      if (realtimeSocketRef.current) {
        realtimeSocketRef.current.close();
        realtimeSocketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (routeSummary?.syncStatus === 'pending' && pendingSyncRef.current) {
      ensureSyncRetryInterval();
    } else if (routeSummary?.syncStatus === 'completed') {
      clearSyncRetryInterval();
    }
  }, [routeSummary?.syncStatus]);

  const startTracking = async () => {
    if (!selectedRoute) {
      Alert.alert('Ruta requerida', 'Selecciona una ruta para iniciar.');
      return;
    }

    if (!unidadLabel) {
      Alert.alert('Unidad requerida', 'No tienes una unidad asignada para iniciar ruta.');
      return;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permiso denegado', 'Debes permitir ubicación para iniciar la ruta.');
        return;
      }

      const routeId = Number(selectedRoute);
      const bufferKey = getRouteBufferKey(routeId);
      await AsyncStorage.removeItem(bufferKey);

      realtimeSocketRef.current = createRealtimeSocket({
        token,
      });

      activeRouteRef.current = routeId;
    routeStartedAtRef.current = Date.now();
      setBufferedCount(0);
      setTracking(true);
    setFinalizingRoute(false);
    setLiveStatus('pending');
    setLastCaptureText('');
      setTrackText('Ruta iniciada. Capturando ubicación cada 10 segundos y guardando localmente.');

      await captureAndBufferLocation();
      locationIntervalRef.current = setInterval(() => {
        captureAndBufferLocation();
      }, TRACK_INTERVAL_MS);
    } catch (error) {
      setTracking(false);
      activeRouteRef.current = null;
      routeStartedAtRef.current = null;
      setLiveStatus('error');
      Alert.alert('Error', getErrorText(error, 'No se pudo iniciar el seguimiento de ubicación.'));
    }
  };

  const liveIndicatorLabel = useMemo(() => {
    if (!tracking) {
      return '';
    }

    if (liveStatus === 'ok') {
      return lastCaptureText ? `En vivo · última captura ${lastCaptureText}` : 'En vivo · capturando correctamente';
    }

    if (liveStatus === 'error') {
      return 'En vivo · error de captura (reintentando)';
    }

    return 'En vivo · iniciando captura';
  }, [tracking, liveStatus, lastCaptureText]);

  if (routeSummary) {
    return <RouteSummaryScreen summary={routeSummary} onBack={() => setRouteSummary(null)} syncRetrying={syncRetrying} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Panel de Chofer</Text>
        <Pressable style={styles.signOutTopButton} onPress={signOut}>
          <Text style={styles.signOutTopText}>Cerrar sesión</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>¡Bienvenido {user?.nombre || 'Chofer'}!</Text>

      <View style={styles.unitCard}>
        <Text style={styles.unitTitle}>Unidad asignada</Text>
        <Text style={styles.unitText}>{unidadLabel || 'No tienes una unidad asignada.'}</Text>
      </View>

      <View style={styles.routeCard}>
        <Text style={styles.routeTitle}>Ruta a realizar</Text>
        <AppDropdown
          label="Rutas disponibles"
          value={selectedRoute}
          options={routeOptions}
          onChange={setSelectedRoute}
          disabled={loadingRoutes || tracking || !unidadLabel}
          placeholder={loadingRoutes ? 'Cargando rutas...' : 'Selecciona una ruta'}
        />

        <Text style={styles.trackText}>{trackText}</Text>
        {tracking ? (
          <View style={styles.liveRow}>
            <View
              style={[
                styles.liveDot,
                liveStatus === 'ok' ? styles.liveDotOk : liveStatus === 'error' ? styles.liveDotError : styles.liveDotPending,
              ]}
            />
            <Text style={styles.liveText}>{liveIndicatorLabel}</Text>
          </View>
        ) : null}
        {tracking ? <Text style={styles.bufferText}>Puntos guardados localmente: {bufferedCount}</Text> : null}

        <View style={styles.routeActions}>
          {!tracking ? (
            <Pressable
              style={[styles.routeButton, styles.startButton, (!selectedRoute || !unidadLabel) && styles.buttonDisabled]}
              onPress={startTracking}
              disabled={!selectedRoute || !unidadLabel}
            >
              <MaterialCommunityIcons name="play" size={16} color="#fff" />
              <Text style={styles.routeButtonText}>Iniciar ruta</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.routeButton, styles.stopButton, finalizingRoute && styles.buttonDisabled]}
              delayLongPress={3000}
              onPressIn={startHoldAnimation}
              onPressOut={resetHoldAnimation}
              onLongPress={finalizeRouteFromHold}
              disabled={finalizingRoute}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.holdProgressFill,
                  {
                    width: holdProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
              <View style={styles.routeButtonContent}>
                <MaterialCommunityIcons name="stop" size={16} color="#fff" />
                <Text style={styles.routeButtonText}>{finalizingRoute ? 'finalizando...' : 'manten para finalizar'}</Text>
              </View>
            </Pressable>
          )}
        </View>

        <Pressable style={[styles.refreshButton, loadingRoutes && styles.buttonDisabled]} onPress={loadDriverRoutes} disabled={loadingRoutes}>
          <Text style={styles.refreshButtonText}>{loadingRoutes ? 'Actualizando...' : 'Actualizar rutas'}</Text>
        </Pressable>
      </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A2A4A',
    flexShrink: 1,
  },
  signOutTopButton: {
    backgroundColor: '#EEF3FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  signOutTopText: {
    color: '#2F6BFF',
    fontWeight: '700',
    fontSize: 12,
  },
  subtitle: {
    color: '#5E6A7D',
    marginTop: 4,
    marginBottom: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  unitCard: {
    backgroundColor: '#fff',
    borderColor: '#E4EAF7',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  unitTitle: {
    color: '#3A4760',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  unitText: {
    color: '#1A2A4A',
    fontSize: 16,
    fontWeight: '700',
  },
  routeCard: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderColor: '#E4EAF7',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  routeTitle: {
    color: '#3A4760',
    fontSize: 12,
    fontWeight: '700',
  },
  trackText: {
    color: '#5E6A7D',
    fontSize: 13,
    lineHeight: 18,
  },
  bufferText: {
    color: '#1A2A4A',
    fontSize: 13,
    fontWeight: '700',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  liveDotOk: {
    backgroundColor: '#13A95A',
  },
  liveDotError: {
    backgroundColor: '#D64545',
  },
  liveDotPending: {
    backgroundColor: '#F0A202',
  },
  liveText: {
    color: '#3A4760',
    fontSize: 12,
    fontWeight: '700',
  },
  routeActions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeButton: {
    flex: 1,
    borderRadius: 12,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  startButton: {
    backgroundColor: '#2F6BFF',
  },
  stopButton: {
    backgroundColor: '#C63E3E',
  },
  routeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  routeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 2,
  },
  holdProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.25)',
    zIndex: 1,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EEF3FF',
  },
  refreshButtonText: {
    color: '#2F6BFF',
    fontWeight: '700',
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
