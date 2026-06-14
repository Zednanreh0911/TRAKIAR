import { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppScreen from '../components/AppScreen';
import { requestPasswordReset } from '../services/apiService';
import { colors } from '../theme/colors';

export default function PasswordResetRequestScreen({ navigation }) {
  const [correo, setCorreo] = useState('');
  const [loading, setLoading] = useState(false);

  const onRequest = async () => {
    if (!correo.trim()) {
      Alert.alert('Correo requerido', 'Ingresa tu correo para recibir el código.');
      return;
    }

    try {
      setLoading(true);
      await requestPasswordReset({ correo: correo.trim().toLowerCase() });
      Alert.alert('Revisa tu correo', 'Si tu correo existe recibirás un código para restablecer la contraseña.');
      navigation.navigate('PasswordResetConfirm', { correo: correo.trim().toLowerCase() });
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo solicitar el restablecimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Restablecer contraseña</Text>

        <View style={styles.form}>
          <AppInput value={correo} onChangeText={setCorreo} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" />

          <AppButton title="Pedir código" onPress={onRequest} loading={loading} />
        </View>
      </SafeAreaView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 20 },
  form: { gap: 12 },
});
