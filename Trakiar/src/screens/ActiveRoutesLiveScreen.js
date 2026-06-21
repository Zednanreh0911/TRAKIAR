import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppCard from '../components/AppCard';
import AppHeroHeader from '../components/AppHeroHeader';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { createManagerRealtimeSocket } from '../services/realtimeService';
import { colors } from '../theme/colors';

const formatCoord = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(6) : 'N/D');

const formatSpeed = (value) => {
  const speed = Number(value);
  return Number.isFinite(speed) ? `${speed.toFixed(2)} km/h` : 'N/D';
};

const formatLastUpdate = (isoDate) => {
  if (!isoDate) {
    return 'Sin datos';
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Sin datos';
  }

  return date.toLocaleTimeString();
};

export default function ActiveRoutesLiveScreen({ navigation }) {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [connectionText, setConnectionText] = useState('Conectando WebSocket...');
  const [errorText, setErrorText] = useState('');
  const [routesMap, setRoutesMap] = useState({});

  useEffect(() => {
    if (user?.rol !== 'gerente' || !token) {
      return undefined;
    }

    socketRef.current = createManagerRealtimeSocket({
      token,
      onOpen: () => {
        setConnectionText('Conectado en tiempo real.');
        setErrorText('');
      },
      onClose: () => {
        setConnectionText('Conexión cerrada.');
      },
      onError: () => {
        setConnectionText('Error de conexión realtime.');
      },
      onMessage: (payload) => {
        if (payload?.type === 'error') {
          setErrorText(payload?.message || 'Error en canal realtime.');
          return;
        }

        if (payload?.type === 'active_routes_snapshot') {
          const snapshotRoutes = payload?.data?.rutas || [];
          const nextMap = {};
          snapshotRoutes.forEach((route) => {
            nextMap[String(route.idUnidad)] = route;
          });
          setRoutesMap(nextMap);
          return;
        }

        if (payload?.type === 'driver_location' && payload?.data?.idUnidad) {
          setRoutesMap((prev) => ({
            ...prev,
            [String(payload.data.idUnidad)]: payload.data,
          }));
        }
      },
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [token, user?.rol]);

  const routes = useMemo(
    () =>
      Object.values(routesMap).sort(
        (a, b) => new Date(b?.lastUpdate || 0).getTime() - new Date(a?.lastUpdate || 0).getTime()
      ),
    [routesMap]
  );

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
          title="Rutas activas en vivo"
          subtitle="Ubicaciones en tiempo real de choferes de tu línea."
          onBack={() => navigation.goBack()}
        />

        <AppCard>
          <View style={styles.statusRow}>
            <View style={styles.liveDot} />
            <Text style={styles.statusText}>{connectionText}</Text>
          </View>
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        </AppCard>

        {routes.length === 0 ? (
          <AppCard>
            <Text style={styles.emptyTitle}>Sin rutas activas por ahora</Text>
            <Text style={styles.emptyText}>Cuando un chofer de tu línea envíe ubicación por WebSocket, aparecerá aquí.</Text>
          </AppCard>
        ) : (
          routes.map((route) => (
            <AppCard key={String(route.idUnidad)}>
              <View style={styles.routeHeaderRow}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.primary} />
                </View>
                <View style={styles.routeHeaderLeft}>
                  <Text style={styles.routeTitle}>{route.nombreRuta || `Ruta ${route.idRuta}`}</Text>
                  <Text style={styles.lastUpdate}>Última: {formatLastUpdate(route.lastUpdate)}</Text>
                </View>
              </View>

              <Text style={styles.detail}>Chofer: <Text style={styles.strong}>{route?.chofer?.nombre || 'N/D'}</Text></Text>
              <Text style={styles.detail}>Unidad: <Text style={styles.strong}>{route?.unidadIdentificador || 'N/D'}</Text></Text>
              <Text style={styles.detail}>Latitud: <Text style={styles.strong}>{formatCoord(route?.ultimaUbicacion?.latitud)}</Text></Text>
              <Text style={styles.detail}>Longitud: <Text style={styles.strong}>{formatCoord(route?.ultimaUbicacion?.longitud)}</Text></Text>
              <Text style={styles.detail}>Velocidad: <Text style={styles.strong}>{formatSpeed(route?.ultimaUbicacion?.velocidadKmh)}</Text></Text>
              <Text style={styles.detail}>Puntos en vivo: <Text style={styles.strong}>{route?.totalPuntosRecibidos || 0}</Text></Text>
            </AppCard>
          ))
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 40,
    paddingTop: Platform.select({ ios:10, android: 50, default: 50 }),
    paddingHorizontal: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: '#1FA971',
  },
  statusText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: {
    marginTop: 8,
    color: '#C63E3E',
    fontSize: 13,
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: colors.textMuted,
    lineHeight: 22,
    fontSize: 14,
  },
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  routeTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  lastUpdate: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  detail: {
    color: colors.textMuted,
    lineHeight: 22,
    fontSize: 14,
  },
  strong: {
    color: colors.primaryDark,
    fontWeight: '700',
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
