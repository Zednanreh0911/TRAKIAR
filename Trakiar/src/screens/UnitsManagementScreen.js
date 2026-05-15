import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import AccordionSection from '../components/AccordionSection';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppDropdown from '../components/AppDropdown';
import AppInput from '../components/AppInput';
import InlineFeedback from '../components/InlineFeedback';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import {
  assignUnit,
  createUnit,
  deleteUnit,
  getUnitsByLine,
  updateUnitStatus,
  updateUnitDriver,
} from '../services/apiService';
import { colors } from '../theme/colors';
import { getErrorText } from '../utils/error';

export default function UnitsManagementScreen() {
  const { token, user } = useAuth();
  const estadoOptions = [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
  ];

  const [estadoUnidad, setEstadoUnidad] = useState('activo');
  const [identificadorUnidad, setIdentificadorUnidad] = useState('');
  const [idUnidad, setIdUnidad] = useState('');
  const [unidades, setUnidades] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [correoChofer, setCorreoChofer] = useState('');
  const [idUnidadGestion, setIdUnidadGestion] = useState('');
  const [correoChoferGestion, setCorreoChoferGestion] = useState('');
  const [idUnidadEstado, setIdUnidadEstado] = useState('');
  const [loadingKey, setLoadingKey] = useState('');
  const [feedback, setFeedback] = useState(null);

  const unidadesDisponibles = unidades.filter((u) => u.id_chofer === null);
  const unidadesOptions = useMemo(
    () =>
      unidadesDisponibles.map((unidad) => ({
        value: String(unidad.id),
        label: `${unidad.identificador || `Unidad #${unidad.id}`} · ${unidad.estado}`,
        leftIconName: 'bus',
        leftIconColor: colors.primary,
      })),
    [unidadesDisponibles]
  );

  const unidadesGestionOptions = useMemo(
    () =>
      unidades.map((unidad) => ({
        value: String(unidad.id),
        label: `${unidad.identificador || `Unidad #${unidad.id}`} · ${unidad.estado} · ${unidad.chofer_nombre || 'Sin chofer'}`,
        leftIconName: 'bus',
        leftIconColor: colors.primary,
      })),
    [unidades]
  );

  const unidadesInactivas = unidades.filter((unidad) => unidad.estado === 'inactivo');
  const unidadesInactivasOptions = useMemo(
    () =>
      unidadesInactivas.map((unidad) => ({
        value: String(unidad.id),
        label: `${unidad.identificador || `Unidad #${unidad.id}`} · ${unidad.estado}`,
        leftIconName: 'bus-alert',
        leftIconColor: '#D1495B',
      })),
    [unidadesInactivas]
  );

  const loadUnits = async () => {
    try {
      setLoadingUnits(true);
      const response = await getUnitsByLine(token);
      const fetchedUnits = response?.unidades ?? [];
      setUnidades(fetchedUnits);

      if (idUnidad && !fetchedUnits.some((u) => String(u.id) === idUnidad)) {
        setIdUnidad('');
      }

      if (idUnidadGestion && !fetchedUnits.some((u) => String(u.id) === idUnidadGestion)) {
        setIdUnidadGestion('');
      }

      if (idUnidadEstado && !fetchedUnits.some((u) => String(u.id) === idUnidadEstado)) {
        setIdUnidadEstado('');
      }
    } catch (error) {
      setFeedback({ tone: 'error', message: getErrorText(error) });
    } finally {
      setLoadingUnits(false);
    }
  };

  useEffect(() => {
    if (token && user?.rol === 'gerente') {
      loadUnits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.rol]);

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

  const runAction = async (key, action, afterSuccess) => {
    try {
      setLoadingKey(key);
      const response = await action();
      if (afterSuccess) {
        await afterSuccess(response);
      }
      setFeedback({ tone: 'success', message: 'Operación completada correctamente.' });
    } catch (error) {
      const message = getErrorText(error);
      setFeedback({ tone: 'error', message });
    } finally {
      setLoadingKey('');
    }
  };

  const confirmDeleteUnit = () => {
    if (!idUnidadGestion) {
      Alert.alert('Falta información', 'Selecciona una unidad para eliminar.');
      return;
    }

    Alert.alert(
      'Eliminar unidad',
      `¿Seguro que deseas eliminar la unidad #${idUnidadGestion}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            runAction(
              'delete-unit',
              () => deleteUnit(token, Number(idUnidadGestion)),
              async () => {
                setIdUnidadGestion('');
                await loadUnits();
              }
            );
          },
        },
      ]
    );
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="bus-multiple" size={28} color={colors.primary} />
          <Text style={styles.header}>Gestión de unidades</Text>
        </View>
        <Text style={styles.subheader}>Administra unidades y asignaciones de tu línea.</Text>

        <AppCard>
          <AccordionSection title="Crear unidad" defaultExpanded contentStyle={styles.sectionBody}>
            <View style={styles.form}>
              <Text style={styles.helperText}>
                La unidad se creará automáticamente en la línea asignada a tu perfil de gerente.
              </Text>
              <AppDropdown
                label="Estado"
                value={estadoUnidad}
                options={estadoOptions.map((option) => ({
                  ...option,
                  leftIconName: option.value === 'activo' ? 'check-circle' : 'close-circle',
                  leftIconColor: option.value === 'activo' ? '#1FA971' : '#D1495B',
                }))}
                onChange={setEstadoUnidad}
                placeholder="Selecciona estado"
                emptyText="No hay estados disponibles."
                leftIconName="check-circle"
                leftIconColor="#1FA971"
              />
              <AppInput
                label="Identificador de unidad"
                value={identificadorUnidad}
                onChangeText={setIdentificadorUnidad}
                autoCapitalize="characters"
                placeholder="Ej: BUS-01"
              />
              <AppButton
                title="Crear unidad"
                loading={loadingKey === 'create'}
                disabled={!identificadorUnidad.trim()}
                onPress={() =>
                  runAction(
                    'create',
                    () =>
                      createUnit(token, {
                        identificador: identificadorUnidad.trim().toUpperCase(),
                        estado: estadoUnidad.trim() || 'activo',
                      }),
                    async (response) => {
                      const createdId = response?.unidad?.id;
                      await loadUnits();
                      setIdentificadorUnidad('');
                      if (createdId) {
                        setIdUnidad(String(createdId));
                      }
                    }
                  )
                }
              />
            </View>
          </AccordionSection>
        </AppCard>

        <AppCard>
          <AccordionSection title="Asignar unidad a chofer" contentStyle={styles.sectionBody}>
            <View style={styles.form}>
              <AppDropdown
                label="Unidad de la línea"
                value={idUnidad}
                options={unidadesOptions}
                onChange={setIdUnidad}
                placeholder="Selecciona una unidad"
                loading={loadingUnits}
                disabled={loadingUnits}
                emptyText="No hay unidades disponibles para esta línea."
                leftIconName="bus"
                leftIconColor={colors.primary}
              />
              <AppInput
                label="Correo del chofer"
                value={correoChofer}
                onChangeText={setCorreoChofer}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="chofer@correo.com"
              />
              <AppButton
                title="Asignar unidad"
                loading={loadingKey === 'assign'}
                disabled={!idUnidad || !correoChofer || loadingUnits}
                onPress={() =>
                  runAction(
                    'assign',
                    () => assignUnit(token, { idUnidad: Number(idUnidad), correo: correoChofer.trim().toLowerCase() }),
                    async () => {
                      await loadUnits();
                    }
                  )
                }
              />
              <AppButton
                title="Actualizar unidades"
                variant="secondary"
                loading={loadingUnits}
                onPress={() => loadUnits()}
              />
            </View>
          </AccordionSection>
        </AppCard>

        <AppCard>
          <AccordionSection title="Actualizar unidades existentes" contentStyle={styles.sectionBody}>
            <View style={styles.form}>
              <AppDropdown
                label="Selecciona unidad"
                value={idUnidadGestion}
                options={unidadesGestionOptions}
                onChange={setIdUnidadGestion}
                placeholder="Selecciona una unidad para gestionar"
                loading={loadingUnits}
                disabled={loadingUnits}
                emptyText="No hay unidades registradas en esta línea."
                leftIconName="bus"
                leftIconColor={colors.primary}
              />

              <AppInput
                label="Nuevo correo de chofer"
                value={correoChoferGestion}
                onChangeText={setCorreoChoferGestion}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="nuevo.chofer@correo.com"
              />

              <AppButton
                title="Cambiar chofer"
                loading={loadingKey === 'update-driver'}
                disabled={!idUnidadGestion || !correoChoferGestion || loadingUnits}
                onPress={() =>
                  runAction(
                    'update-driver',
                    () =>
                      updateUnitDriver(token, {
                        idUnidad: Number(idUnidadGestion),
                        correo: correoChoferGestion.trim().toLowerCase(),
                      }),
                    async () => {
                      await loadUnits();
                    }
                  )
                }
              />

              <AppButton
                title="Eliminar unidad"
                variant="secondary"
                loading={loadingKey === 'delete-unit'}
                disabled={!idUnidadGestion || loadingUnits}
                onPress={confirmDeleteUnit}
              />

              <Text style={styles.sectionTitle}>Unidades inactivas</Text>
              <AppDropdown
                label="Selecciona unidad inactiva"
                value={idUnidadEstado}
                options={unidadesInactivasOptions}
                onChange={setIdUnidadEstado}
                placeholder="Selecciona una unidad"
                loading={loadingUnits}
                disabled={loadingUnits}
                emptyText="No hay unidades inactivas en esta línea."
                leftIconName="bus-alert"
                leftIconColor="#D1495B"
              />
              <AppButton
                title="Activar unidad"
                loading={loadingKey === 'activate-unit'}
                disabled={!idUnidadEstado || loadingUnits}
                onPress={() =>
                  runAction(
                    'activate-unit',
                    () => updateUnitStatus(token, { idUnidad: Number(idUnidadEstado), estado: 'activo' }),
                    async () => {
                      await loadUnits();
                      setIdUnidadEstado('');
                    }
                  )
                }
              />

              <Text style={styles.listTitle}>Listado de unidades</Text>
              {unidades.length === 0 ? (
                <Text style={styles.emptyListText}>Aún no hay unidades registradas para esta línea.</Text>
              ) : (
                <View style={styles.unitsList}>
                  {unidades.map((unidad) => (
                    <View key={unidad.id} style={styles.unitRow}>
                      <View style={styles.unitRowLeft}>
                        <MaterialCommunityIcons name="bus" size={16} color={colors.primary} />
                        <Text style={styles.unitRowText}>{unidad.identificador || `Unidad #${unidad.id}`} · {unidad.estado}</Text>
                      </View>
                      <Text style={styles.unitDriverText}>
                        {unidad.chofer_nombre ? `${unidad.chofer_nombre} (${unidad.chofer_correo})` : 'Sin chofer asignado'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
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
  sectionTitle: { color: colors.text, fontWeight: '700', marginTop: 6 },
  listTitle: { color: colors.text, fontWeight: '700', marginTop: 6 },
  emptyListText: { color: colors.textMuted, fontSize: 13 },
  feedback: { marginTop: 4 },
  unitsList: { gap: 8 },
  unitRow: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  unitRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitRowText: { color: colors.text, fontWeight: '600' },
  unitDriverText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  deniedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 8 },
  deniedTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  deniedText: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
