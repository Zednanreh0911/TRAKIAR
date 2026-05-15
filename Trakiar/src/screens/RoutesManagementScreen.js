import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import AccordionSection from '../components/AccordionSection';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppDropdown from '../components/AppDropdown';
import AppInput from '../components/AppInput';
import InlineFeedback from '../components/InlineFeedback';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { addRoute, deleteRoute, editRoute, getRoutesByLine } from '../services/apiService';
import { colors } from '../theme/colors';
import { getErrorText } from '../utils/error';

export default function RoutesManagementScreen() {
  const { token, user } = useAuth();

  const [rutas, setRutas] = useState([]);
  const [routeName, setRouteName] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  const [idRuta, setIdRuta] = useState('');
  const [loadingKey, setLoadingKey] = useState('');
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const rutasOptions = useMemo(
    () =>
      rutas.map((ruta) => ({
        value: String(ruta.id),
        label: ruta.nombre,
        leftIconName: 'routes',
        leftIconColor: colors.primary,
      })),
    [rutas]
  );

  const loadRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const response = await getRoutesByLine(token);
      const fetchedRoutes = response?.rutas ?? [];
      setRutas(fetchedRoutes);

      if (idRuta && !fetchedRoutes.some((r) => String(r.id) === idRuta)) {
        setIdRuta('');
      }
    } catch (error) {
      setFeedback({ tone: 'error', message: getErrorText(error) });
    } finally {
      setLoadingRoutes(false);
    }
  };

  useEffect(() => {
    if (token && user?.rol === 'gerente') {
      loadRoutes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.rol]);

  useEffect(() => {
    const rutaSeleccionada = rutas.find((ruta) => String(ruta.id) === idRuta);
    if (rutaSeleccionada) {
      setRouteName(rutaSeleccionada.nombre || '');
      setRouteDesc(rutaSeleccionada.descripcion || '');
    }
  }, [idRuta, rutas]);

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

  const runAction = async (key, action) => {
    try {
      setLoadingKey(key);
      await action();
      setFeedback({ tone: 'success', message: 'Operación completada correctamente.' });
    } catch (error) {
      const message = getErrorText(error);
      setFeedback({ tone: 'error', message });
    } finally {
      setLoadingKey('');
    }
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="map-marker-path" size={28} color={colors.primary} />
          <Text style={styles.header}>Gestión de rutas</Text>
        </View>
        <Text style={styles.subheader}>Crea, edita o elimina rutas asociadas a tu línea.</Text>

        <AppCard>
          <AccordionSection title="Crear ruta" defaultExpanded contentStyle={styles.sectionBody}>
            <View style={styles.form}>
              <Text style={styles.helperText}>
                La ruta se creará automáticamente en la línea asignada a tu perfil de gerente.
              </Text>
              <AppInput label="Nombre de ruta" value={routeName} onChangeText={setRouteName} />
              <AppInput label="Descripción" value={routeDesc} onChangeText={setRouteDesc} />
              <AppButton
                title="Crear ruta"
                loading={loadingKey === 'create'}
                onPress={() =>
                  runAction(
                    'create',
                    () =>
                      addRoute(token, {
                        nombre: routeName,
                        descripcion: routeDesc,
                      }),
                    async () => {
                      setRouteName('');
                      setRouteDesc('');
                      await loadRoutes();
                    }
                  )
                }
              />
            </View>
          </AccordionSection>
        </AppCard>

        <AppCard>
          <AccordionSection title="Editar o eliminar ruta" contentStyle={styles.sectionBody}>
            <View style={styles.form}>
              <AppDropdown
                label="Ruta existente"
                value={idRuta}
                options={rutasOptions}
                onChange={setIdRuta}
                placeholder="Selecciona una ruta"
                loading={loadingRoutes}
                disabled={loadingRoutes}
                emptyText="No hay rutas registradas en tu línea."
                leftIconName="map-marker-path"
                leftIconColor={colors.primary}
              />
              <AppInput label="Nombre de ruta" value={routeName} onChangeText={setRouteName} />
              <AppInput label="Descripción" value={routeDesc} onChangeText={setRouteDesc} />
              <AppButton
                title="Editar ruta"
                variant="secondary"
                loading={loadingKey === 'edit'}
                disabled={!idRuta || !routeName || !routeDesc}
                onPress={() =>
                  runAction(
                    'edit',
                    () =>
                      editRoute(token, Number(idRuta), {
                        nombre: routeName,
                        descripcion: routeDesc,
                      }),
                    async () => {
                      await loadRoutes();
                    }
                  )
                }
              />
              <AppButton
                title="Eliminar ruta"
                variant="secondary"
                loading={loadingKey === 'delete'}
                disabled={!idRuta}
                onPress={() =>
                  runAction('delete', () => deleteRoute(token, Number(idRuta)), async () => {
                    setIdRuta('');
                    setRouteName('');
                    setRouteDesc('');
                    await loadRoutes();
                  })
                }
              />
              <AppButton title="Actualizar rutas" variant="secondary" loading={loadingRoutes} onPress={loadRoutes} />
            </View>
          </AccordionSection>
        </AppCard>

        <InlineFeedback message={feedback?.message} tone={feedback?.tone} style={styles.feedback} />

      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 28, paddingTop: Platform.select({ ios:10, android: 50, default: 50 }) },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  header: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subheader: { color: colors.textMuted, lineHeight: 20 },
  helperText: { color: colors.textMuted, lineHeight: 20, fontSize: 13 },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 },
  sectionBody: { marginTop: 10 },
  form: { gap: 10 },
  feedback: { marginTop: 4 },
  deniedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 8 },
  deniedTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  deniedText: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
