import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import AccordionSection from '../components/AccordionSection';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppInput from '../components/AppInput';
import InlineFeedback from '../components/InlineFeedback';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { demoteDriver, promoteToDriver } from '../services/apiService';
import { colors } from '../theme/colors';
import { getErrorText } from '../utils/error';

export default function PeopleManagementScreen() {
  const { token, user } = useAuth();
  const [correoUsuario, setCorreoUsuario] = useState('');
  const [cedula, setCedula] = useState('');
  const [correoDemote, setCorreoDemote] = useState('');
  const [loadingKey, setLoadingKey] = useState('');
  const [feedback, setFeedback] = useState(null);

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

  const runAction = async (key, action, successMessage) => {
    try {
      setLoadingKey(key);
      await action();
      setFeedback({ tone: 'success', message: successMessage });
    } catch (error) {
      const message = getErrorText(error);
      setFeedback({ tone: 'error', message });
    } finally {
      setLoadingKey('');
    }
  };

  const onPromote = async () => {
    if (!correoUsuario || !cedula) {
      setFeedback({ tone: 'error', message: 'Ingresa correo y cédula.' });
      return;
    }

    await runAction(
      'promote',
      () => promoteToDriver(token, { correo: correoUsuario.trim(), cedula: cedula.trim() }),
      'Usuario promovido a chofer.'
    );
  };

  const onDemote = async () => {
    if (!correoDemote) {
      setFeedback({ tone: 'error', message: 'Ingresa el correo del chofer.' });
      return;
    }

    await runAction(
      'demote',
      () => demoteDriver(token, { correo: correoDemote.trim() }),
      'Chofer degradado a usuario.'
    );
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="account-group" size={28} color={colors.primary} />
          <Text style={styles.header}>Gestión de personas</Text>
        </View>
        <Text style={styles.subheader}>Administra choferes desde correo, sin depender de IDs internos.</Text>

        <AppCard>
          <AccordionSection title="Promover usuario a chofer" defaultExpanded contentStyle={styles.sectionBody}>
            <View style={styles.form}>
              <AppInput
                label="Correo del usuario"
                value={correoUsuario}
                onChangeText={setCorreoUsuario}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="usuario@correo.com"
              />
              <AppInput label="Cédula" value={cedula} onChangeText={setCedula} placeholder="Ej: V12345678" />
              <AppButton title="Promover a chofer" onPress={onPromote} loading={loadingKey === 'promote'} />
            </View>
          </AccordionSection>
        </AppCard>

        <AppCard>
          <AccordionSection title="Degradar chofer a usuario" contentStyle={styles.sectionBody}>
            <View style={styles.form}>
              <AppInput
                label="Correo del chofer"
                value={correoDemote}
                onChangeText={setCorreoDemote}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="chofer@correo.com"
              />
              <AppButton
                title="Degradar a usuario"
                variant="secondary"
                onPress={onDemote}
                loading={loadingKey === 'demote'}
              />
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
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 },
  sectionBody: { marginTop: 10 },
  form: { gap: 10 },
  feedback: { marginTop: 4 },
  deniedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 8 },
  deniedTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  deniedText: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
