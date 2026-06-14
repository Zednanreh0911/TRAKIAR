import { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppDropdown from '../components/AppDropdown';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function CompleteProfileScreen() {
  const { completeMyProfile } = useAuth();
  const [tipoLinea, setTipoLinea] = useState('natural');
  const [loading, setLoading] = useState(false);

  const onContinue = async () => {
    try {
      setLoading(true);
      await completeMyProfile({ tipoLinea });
      Alert.alert('Perfil listo', 'Ya puedes usar la app.');
    } catch (error) {
      Alert.alert('No se pudo completar el perfil', error?.response?.data?.error || error?.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen containerStyle={styles.container}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Completa tu perfil</Text>
        <Text style={styles.subtitle}>Necesitamos saber si eres estudiante para ajustar tu experiencia.</Text>

        <View style={styles.card}>
          <AppDropdown
            label="¿Eres estudiante?"
            value={tipoLinea}
            onChange={setTipoLinea}
            options={[
              { label: 'No', value: 'natural', leftIconName: 'account' },
              { label: 'Sí', value: 'estudiantes', leftIconName: 'school' },
            ]}
          />

          <AppButton title="Continuar" onPress={onContinue} loading={loading} style={styles.button} />
        </View>
      </SafeAreaView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  subtitle: {
    marginTop: 8,
    color: colors.text,
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 18,
  },
  button: {
    borderRadius: 22,
  },
});