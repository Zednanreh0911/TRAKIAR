import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import AnimatedEntrance from '../components/AnimatedEntrance';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import { useAuth } from '../context/AuthContext';
import { estimateRouteEta } from '../services/apiService';
import { colors } from '../theme/colors';
import { getErrorText } from '../utils/error';

let MapView;
let Marker;
let Polyline;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
}

const INITIAL_REGION = {
  latitude: 7.1193,
  longitude: -73.1227,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const LOCATION_REFRESH_MS = 25000;
const ETA_REFRESH_MS = 20000;

const formatEtaMessage = (etaPayload) => {
  if (!etaPayload) {
    return 'Selecciona una ruta y consulta ETA para ver estimación.';
  }

  return `Llegada aprox: ${etaPayload.etaMinutos} min (${etaPayload.confidence || 'N/A'})`;
};

export default function UserMapScreen({ navigation, route }) {
  const { token } = useAuth();
  const mapRef = useRef(null);
  const etaPollRef = useRef(null);
  const locationPollRef = useRef(null);
  const etaCacheRef = useRef(new Map());

  const [permissionStatus, setPermissionStatus] = useState('pending');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedRouteLabel, setSelectedRouteLabel] = useState('');
  const [etaLoading, setEtaLoading] = useState(false);
  const [etaData, setEtaData] = useState(null);
  const [etaError, setEtaError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');

  const isTimeoutError = useCallback(
    (error) =>
      error?.code === 'ECONNABORTED' ||
      /timeout|tiempo de espera|aborted/i.test(String(error?.message || '')),
    []
  );

  const selectedRouteData = useMemo(
    () => (selectedRoute ? { value: selectedRoute, label: selectedRouteLabel } : null),
    [selectedRoute, selectedRouteLabel]
  );

  const nearestStopCoordinate = useMemo(() => {
    if (!etaData?.nearestStop?.latitud || !etaData?.nearestStop?.longitud) {
      return null;
    }

    return {
      latitude: Number(etaData.nearestStop.latitud),
      longitude: Number(etaData.nearestStop.longitud),
    };
  }, [etaData]);

  const unitCoordinate = useMemo(() => {
    if (!etaData?.bus?.latitud || !etaData?.bus?.longitud) {
      return null;
    }

    return {
      latitude: Number(etaData.bus.latitud),
      longitude: Number(etaData.bus.longitud),
    };
  }, [etaData]);

  const routePolylineCoordinates = useMemo(() => {
    const points = etaData?.routeShape?.coordinates;
    if (!Array.isArray(points) || points.length < 2) {
      return [];
    }

    return points
      .map((point) => ({
        latitude: Number(point.latitud),
        longitude: Number(point.longitud),
      }))
      .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
  }, [etaData]);

  const captureUserLocation = useCallback(async () => {
    if (Platform.OS === 'web') {
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coordinate = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    setUserLocation(coordinate);
    mapRef.current?.animateToRegion(
      {
        ...coordinate,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      600
    );
  }, []);

  const requestLocationAccess = useCallback(async () => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setPermissionStatus('denied');
        return;
      }

      setPermissionStatus('granted');
      await captureUserLocation();

      if (locationPollRef.current) {
        clearInterval(locationPollRef.current);
      }

      locationPollRef.current = setInterval(() => {
        captureUserLocation().catch(() => {
          // se ignora para no romper polling
        });
      }, LOCATION_REFRESH_MS);
    } catch {
      setPermissionStatus('error');
    }
  }, [captureUserLocation]);

  const refreshEta = useCallback(async () => {
    if (!token || !selectedRoute || !userLocation) {
      return;
    }

    const routeKey = String(selectedRoute);

    try {
      setEtaLoading(true);
      setEtaError('');
      const payload = await estimateRouteEta(token, selectedRoute, {
        latitud: userLocation.latitude,
        longitud: userLocation.longitude,
      });

      etaCacheRef.current.set(routeKey, payload);
      setEtaData(payload);
      setLastUpdatedAt(new Date().toLocaleTimeString());
    } catch (error) {
      const cachedPayload = etaCacheRef.current.get(routeKey) || null;

      if (cachedPayload) {
        setEtaData(cachedPayload);
      }

      if (isTimeoutError(error)) {
        setEtaError(
          cachedPayload
            ? 'Conexión lenta: mostrando última ruta válida mientras reintentamos.'
            : 'El servidor tardó en responder. Reintentando ETA…'
        );
      } else {
        setEtaError(getErrorText(error));
      }
    } finally {
      setEtaLoading(false);
    }
  }, [isTimeoutError, selectedRoute, token, userLocation]);

  useEffect(() => {
    const nextRouteId = route?.params?.selectedRouteId;
    const nextRouteLabel = route?.params?.selectedRouteLabel;

    if (!nextRouteId) {
      return;
    }

    setSelectedRoute(String(nextRouteId));
    setSelectedRouteLabel(String(nextRouteLabel || `Ruta #${nextRouteId}`));
    setEtaError('');
  }, [route?.params?.selectedRouteId, route?.params?.selectedRouteLabel]);

  useEffect(() => {
    requestLocationAccess();

    return () => {
      if (locationPollRef.current) {
        clearInterval(locationPollRef.current);
      }
      if (etaPollRef.current) {
        clearInterval(etaPollRef.current);
      }
    };
  }, [requestLocationAccess]);

  useEffect(() => {
    if (etaPollRef.current) {
      clearInterval(etaPollRef.current);
      etaPollRef.current = null;
    }

    if (!selectedRoute || !userLocation) {
      setEtaData(null);
      return;
    }

    const cachedPayload = etaCacheRef.current.get(String(selectedRoute)) || null;
    setEtaData(cachedPayload);

    refreshEta();
    etaPollRef.current = setInterval(() => {
      refreshEta().catch(() => {
        // se ignora para no cortar el intervalo
      });
    }, ETA_REFRESH_MS);
  }, [selectedRoute, userLocation, refreshEta]);

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.webFallbackWrap}>
          <Text style={styles.webFallbackTitle}>Mapa disponible en móvil</Text>
          <Text style={styles.webFallbackText}>
            El componente de mapa nativo está habilitado para Android/iOS. En web dejamos este fallback para evitar errores de compatibilidad.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          showsUserLocation
          showsMyLocationButton
          loadingEnabled
        >
          {routePolylineCoordinates.length >= 2 ? (
            <Polyline
              coordinates={routePolylineCoordinates}
              strokeColor={colors.primary}
              strokeWidth={5}
            />
          ) : unitCoordinate && nearestStopCoordinate ? (
            <Polyline
              coordinates={[unitCoordinate, nearestStopCoordinate]}
              strokeColor={colors.primary}
              strokeWidth={5}
            />
          ) : null}

          {unitCoordinate ? (
            <Marker
              coordinate={unitCoordinate}
              title="Buseta en ruta"
              description="Ubicación estimada de la unidad"
              pinColor={colors.primaryDark}
            />
          ) : null}

          {nearestStopCoordinate ? (
            <Marker
              coordinate={nearestStopCoordinate}
              title={etaData?.nearestStop?.nombre || 'Punto de encuentro'}
              description="Punto cercano para abordar"
              pinColor={colors.success}
            />
          ) : null}
        </MapView>

        <AnimatedEntrance delay={80} distance={18}>
          <AppCard style={styles.overlayCard}>
          <Text style={styles.overlayEta}>{formatEtaMessage(etaData)}</Text>

          <Text style={styles.overlayRoute}>
            {selectedRouteData
              ? `Ruta: ${selectedRouteData.label}`
              : 'Aún no hay ruta seleccionada.'}
          </Text>

          <AppButton
            title="Cambiar ruta"
            variant="secondary"
            iconName="swap-horizontal"
            onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
          />

          <Text style={styles.overlayHint}>
            {selectedRoute
              ? 'Ruta seleccionada'
              : 'Selecciona una ruta en Inicio'}
            {' · '}
            {permissionStatus === 'granted'
              ? 'Ubicación activa'
              : permissionStatus === 'denied'
                ? 'Ubicación denegada'
                : 'Solicitando ubicación'}
            {lastUpdatedAt ? ` · actualizado ${lastUpdatedAt}` : ''}
          </Text>

          {etaData?.routeShape ? (
            <Text style={styles.overlayDebug}>
              Trazo: {etaData.routeShape.source || 'N/D'}
              {etaData.routeShape.fallbackReason ? ` (${etaData.routeShape.fallbackReason})` : ''}
              {Number.isFinite(Number(etaData.routeShape.totalPoints)) ? ` · pts ${etaData.routeShape.totalPoints}` : ''}
            </Text>
          ) : null}

          {etaLoading ? <Text style={styles.loadingText}>Actualizando ETA...</Text> : null}
          {!!etaError ? <Text style={styles.errorText}>{etaError}</Text> : null}
          </AppCard>
        </AnimatedEntrance>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  overlayCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
    gap: 6,
    paddingBottom: 8,
  },
  overlayEta: {
    color: colors.text,
    lineHeight: 20,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  overlayRoute: {
    color: colors.text,
    lineHeight: 18,
    fontWeight: '600',
  },
  overlayHint: {
    color: colors.textMuted,
    lineHeight: 16,
    fontSize: 12,
  },
  loadingText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  overlayDebug: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 16,
  },
  webFallbackWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  webFallbackTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  webFallbackText: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
});
