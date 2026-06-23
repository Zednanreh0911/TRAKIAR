import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedEntrance from '../components/AnimatedEntrance';
import AppCard from '../components/AppCard';
import { useAuth } from '../context/AuthContext';
import { estimateRouteEta } from '../services/apiService';
import { createPassengerRealtimeSocket } from '../services/realtimeService';
import { colors } from '../theme/colors';
import { getErrorText } from '../utils/error';

let Mapbox;

if (Platform.OS !== 'web') {
  Mapbox = require('@rnmapbox/maps').default;
  Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiYW5kcm9tZWRhMDkiLCJhIjoiY21vMXQ3NnJzMG0zaTJwcTR0bHZ5cmg4biJ9.NPWNUVc6EEqfzIa9VtXwfw');
}

const INITIAL_COORDINATE = [-73.1227, 7.1193];

const LOCATION_REFRESH_MS = 25000;
const ETA_REFRESH_MS = 20000;
const REALTIME_STALE_MS = 45000;

const getEtaIcon = (confidence) => {
  if (confidence === 'high') return 'bus-clock';
  if (confidence === 'medium') return 'clock-outline';
  return 'map-clock-outline';
};

const getEtaColor = (confidence) => {
  if (confidence === 'high') return '#22C55E';
  if (confidence === 'medium') return '#F59E0B';
  return colors.textMuted;
};

function getBearing(startLat, startLng, destLat, destLng) {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  let brng = Math.atan2(y, x);
  brng = (brng * 180) / Math.PI;
  return (brng + 360) % 360;
}

export default function UserMapScreen({ navigation, route }) {
  const { token } = useAuth();
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const etaPollRef = useRef(null);
  const locationPollRef = useRef(null);
  const realtimeSocketRef = useRef(null);
  const etaCacheRef = useRef(new Map());

  const [permissionStatus, setPermissionStatus] = useState('pending');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedRouteLabel, setSelectedRouteLabel] = useState('');
  const [etaLoading, setEtaLoading] = useState(false);
  const [etaData, setEtaData] = useState(null);
  const [etaError, setEtaError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [activeBuses, setActiveBuses] = useState({});
  const [persistedRouteShape, setPersistedRouteShape] = useState(null);

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

  const routePolylineCoordinates = useMemo(() => {
    const points = (etaData?.routeShape || persistedRouteShape)?.coordinates;
    if (!Array.isArray(points) || points.length < 2) {
      return [];
    }

    return points
      .map((point) => [Number(point.longitud), Number(point.latitud)])
      .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
  }, [etaData, persistedRouteShape]);

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
    cameraRef.current?.setCamera({
      centerCoordinate: [coordinate.longitude, coordinate.latitude],
      zoomLevel: 15,
      animationDuration: 600,
    });
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
      if (payload?.routeShape?.coordinates?.length >= 2) {
        setPersistedRouteShape(payload.routeShape);
      }
      setLastUpdatedAt(new Date().toLocaleTimeString());
    } catch (error) {
      const cachedPayload = etaCacheRef.current.get(routeKey) || null;

      // Even on error (e.g. no drivers), backend may return routeShape
      const errorData = error?.response?.data;
      if (errorData?.routeShape?.coordinates?.length >= 2) {
        setPersistedRouteShape(errorData.routeShape);
      }

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
      if (realtimeSocketRef.current) {
        realtimeSocketRef.current.close();
        realtimeSocketRef.current = null;
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
      setPersistedRouteShape(null);
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

  useEffect(() => {
    if (!token || !selectedRoute) {
      if (realtimeSocketRef.current) {
        realtimeSocketRef.current.close();
        realtimeSocketRef.current = null;
      }
      setActiveBuses({});
      return;
    }

    if (realtimeSocketRef.current) {
      realtimeSocketRef.current.close();
      realtimeSocketRef.current = null;
    }

    setActiveBuses({});

    realtimeSocketRef.current = createPassengerRealtimeSocket({
      token,
      idRuta: selectedRoute,
      onOpen: () => { },
      onClose: () => { },
      onError: () => { },
      onMessage: (payload) => {
        if (payload?.type === 'driver_location' && payload?.data) {
          const busData = payload.data;
          const idUnidad = busData.idUnidad;
          const lastUpdate = busData.lastUpdate || busData.ultimaUbicacion?.capturedAt || null;
          const latitud = Number(busData.ultimaUbicacion?.latitud ?? busData.latitud);
          const longitud = Number(busData.ultimaUbicacion?.longitud ?? busData.longitud);
          const velocidadKmh = busData.ultimaUbicacion?.velocidadKmh ?? busData.velocidadKmh ?? null;
          const unidadIdentificador = busData.unidadIdentificador;

          if (latitud != null && longitud != null && idUnidad) {
            setActiveBuses((prev) => {
              const prevBus = prev[idUnidad];
              let bearing = 0;
              if (prevBus && prevBus.latitud && prevBus.longitud) {
                bearing = getBearing(prevBus.latitud, prevBus.longitud, latitud, longitud);
                if (prevBus.latitud === latitud && prevBus.longitud === longitud) {
                  bearing = prevBus.bearing || 0;
                }
              }
              return {
                ...prev,
                [idUnidad]: {
                  idUnidad,
                  unidadIdentificador,
                  latitud,
                  longitud,
                  velocidadKmh,
                  lastUpdate,
                  bearing,
                },
              };
            });
          }
        }
      },
    });

    return () => {
      if (realtimeSocketRef.current) {
        realtimeSocketRef.current.close();
        realtimeSocketRef.current = null;
      }
    };
  }, [selectedRoute, token]);

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
        <Mapbox.MapView
          ref={mapRef}
          style={styles.map}
          styleURL={Mapbox.StyleURL.Street}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: INITIAL_COORDINATE,
              zoomLevel: 13.5,
              pitch: 45,
            }}
          />

          <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} />

          {routePolylineCoordinates.length >= 2 ? (
            <Mapbox.ShapeSource
              id="routeSource"
              shape={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: routePolylineCoordinates,
                },
              }}
            >
              <Mapbox.LineLayer
                id="routeLine"
                style={{
                  lineColor: colors.primary,
                  lineWidth: 5,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>
          ) : null}

          {Object.values(activeBuses).map((bus) => {
            const lastUpdate = new Date(bus.lastUpdate || 0).getTime();
            if (!lastUpdate || Date.now() - lastUpdate > REALTIME_STALE_MS) return null;

            const isTarget = etaData?.metadata?.idUnidad === bus.idUnidad;

            return (
              <Mapbox.MarkerView
                key={String(bus.idUnidad)}
                id={String(bus.idUnidad)}
                coordinate={[bus.longitud, bus.latitud]}
              >
                <View style={styles.markerContainer}>
                  <Image
                    source={require('../../assets/BUS3D.png')}
                    style={[
                      styles.busMarkerImage,
                      { transform: [{ rotate: `${bus.bearing || 0}deg` }] }
                    ]}
                  />
                  {isTarget && (
                    <View style={styles.targetIndicator} />
                  )}
                </View>
              </Mapbox.MarkerView>
            );
          })}

          {!activeBuses[etaData?.metadata?.idUnidad] && etaData?.bus?.latitud && etaData?.bus?.longitud ? (
            <Mapbox.MarkerView
              id="estimatedBus"
              coordinate={[Number(etaData.bus.longitud), Number(etaData.bus.latitud)]}
            >
              <View style={[styles.markerContainer, { opacity: 0.75 }]}>
                <Image
                  source={require('../../assets/BUS3D.png')}
                  style={[styles.busMarkerImage]}
                />
              </View>
            </Mapbox.MarkerView>
          ) : null}

          {nearestStopCoordinate ? (
            <Mapbox.MarkerView
              id="nearestStop"
              coordinate={[nearestStopCoordinate.longitude, nearestStopCoordinate.latitude]}
            >
              <View style={styles.stopMarkerContainer}>
                <MaterialCommunityIcons name="bus-stop" size={20} color="#ffffff" />
              </View>
            </Mapbox.MarkerView>
          ) : null}
        </Mapbox.MapView>

        <TouchableOpacity style={styles.floatingBackButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primaryDark} />
        </TouchableOpacity>

        <AnimatedEntrance delay={80} distance={18}>
          <AppCard style={styles.overlayCard}>

            {/* Row 1: Route label + change button */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardRouteInfo}>
                <MaterialCommunityIcons name="bus-multiple" size={16} color={colors.primary} />
                <Text style={styles.cardRouteLabel} numberOfLines={1}>
                  {selectedRouteLabel || 'Sin ruta seleccionada'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeRouteBtn}
                onPress={() => navigation.navigate('MainTabs', { screen: 'RoutesTab' })}
              >
                <MaterialCommunityIcons name="swap-horizontal" size={14} color={colors.primary} />
                <Text style={styles.changeRouteBtnText}>Cambiar</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.cardDivider} />

            {/* Row 2: ETA block */}
            {etaData ? (
              <View style={styles.etaRow}>
                <MaterialCommunityIcons
                  name={getEtaIcon(etaData.confidence)}
                  size={28}
                  color={getEtaColor(etaData.confidence)}
                />
                <View style={styles.etaTextBlock}>
                  <Text style={[styles.etaMinutes, { color: getEtaColor(etaData.confidence) }]}>
                    {etaData.etaMinutos} min
                  </Text>
                  <Text style={styles.etaSubtext}>
                    {etaData.etaRangoMinutos
                      ? `Rango estimado: ${etaData.etaRangoMinutos.min}–${etaData.etaRangoMinutos.max} min`
                      : etaData.nearestStop?.nombre
                        ? `Parada: ${etaData.nearestStop.nombre}`
                        : 'Llegada estimada de tu buseta'}
                  </Text>
                </View>
              </View>
            ) : etaLoading ? (
              <View style={styles.etaRow}>
                <MaterialCommunityIcons name="radar" size={26} color={colors.primary} />
                <Text style={styles.etaLoadingText}>Calculando tiempo de llegada...</Text>
              </View>
            ) : etaError ? (
              <View style={styles.etaRow}>
                <MaterialCommunityIcons name="wifi-off" size={24} color={colors.textMuted} />
                <View style={styles.etaTextBlock}>
                  <Text style={styles.etaNoDataTitle}>Sin datos en tiempo real</Text>
                  <Text style={styles.etaNoDataSubtext}>No hay busetas activas en este momento.</Text>
                </View>
              </View>
            ) : selectedRoute ? (
              <View style={styles.etaRow}>
                <MaterialCommunityIcons name="radar" size={26} color={colors.primary} />
                <Text style={styles.etaLoadingText}>Consultando ETA...</Text>
              </View>
            ) : null}

            {/* Row 3: Status pills */}
            <View style={styles.statusRow}>
              <View style={[styles.statusPill, permissionStatus === 'granted' ? styles.pillGreen : styles.pillGray]}>
                <MaterialCommunityIcons
                  name={permissionStatus === 'granted' ? 'crosshairs-gps' : 'crosshairs'}
                  size={11}
                  color={permissionStatus === 'granted' ? '#22C55E' : colors.textMuted}
                />
                <Text style={[styles.pillText, permissionStatus === 'granted' ? styles.pillTextGreen : styles.pillTextGray]}>
                  {permissionStatus === 'granted' ? 'Ubicación activa' : 'Sin ubicación'}
                </Text>
              </View>
              {Object.keys(activeBuses).length > 0 ? (
                <View style={[styles.statusPill, styles.pillGreen]}>
                  <MaterialCommunityIcons name="bus" size={11} color="#22C55E" />
                  <Text style={[styles.pillText, styles.pillTextGreen]}>
                    {Object.keys(activeBuses).length} bus{Object.keys(activeBuses).length !== 1 ? 'etas' : 'eta'} activa{Object.keys(activeBuses).length !== 1 ? 's' : ''}
                  </Text>
                </View>
              ) : null}
              {lastUpdatedAt ? (
                <Text style={styles.updatedAt}>act. {lastUpdatedAt}</Text>
              ) : null}
            </View>

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
  floatingBackButton: {
    position: 'absolute',
    top: Platform.select({ ios: 44, android: 16, default: 16 }),
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  overlayCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  /* Header row */
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardRouteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardRouteLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  changeRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.primary + '18',
  },
  changeRouteBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border || colors.textMuted + '30',
    marginVertical: 2,
  },
  /* ETA block */
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  etaTextBlock: {
    flex: 1,
  },
  etaMinutes: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 32,
  },
  etaSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  etaLoadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  etaNoDataTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  etaNoDataSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  /* Status pills row */
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillGreen: {
    backgroundColor: '#22C55E18',
  },
  pillGray: {
    backgroundColor: colors.textMuted + '18',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillTextGreen: {
    color: '#22C55E',
  },
  pillTextGray: {
    color: colors.textMuted,
  },
  updatedAt: {
    color: colors.textMuted,
    fontSize: 11,
    marginLeft: 'auto',
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
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 110,
  },
  busMarkerImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  targetIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  stopMarkerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
