import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppInput from '../components/AppInput';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { promoteToDriver } from '../services/apiService';
import { colors } from '../theme/colors';
import { getErrorText } from '../utils/error';

export default function PeopleManagementScreen() {
  const { token, user } = useAuth();
  const [correoUsuario, setCorreoUsuario] = useState('');
  const [cedula, setCedula] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState('Promueve usuarios a choferes usando su correo.');

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

  const onPromote = async () => {
    if (!correoUsuario || !cedula) {
      Alert.alert('Campos requeridos', 'Ingresa correo y cédula.');
      return;
    }

    try {
      setLoading(true);
      const response = await promoteToDriver(token, { correo: correoUsuario.trim(), cedula: cedula.trim() });
      setResponseText(JSON.stringify(response, null, 2));
      Alert.alert('Éxito', 'Usuario promovido a chofer.');
    } catch (error) {
      const message = getErrorText(error);
      setResponseText(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.sectionTitle}>Promover usuario a chofer</Text>
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
            <AppButton title="Promover a chofer" onPress={onPromote} loading={loading} />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Respuesta</Text>
          <Text style={styles.response}>{responseText}</Text>
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  header: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subheader: { color: colors.textMuted, lineHeight: 20 },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 },
  form: { gap: 10 },
  response: {
    color: '#12346B',
    backgroundColor: '#EEF3FF',
    borderWidth: 1,
    borderColor: '#D9E5FF',
    borderRadius: 12,
    minHeight: 90,
    padding: 10,
  },
  deniedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 8 },
  deniedTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  deniedText: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
