import { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppScreen from '../components/AppScreen';
import { confirmPasswordReset } from '../services/apiService';
import { colors } from '../theme/colors';

export default function PasswordResetConfirmScreen({ route, navigation }) {
  const initialCorreo = route?.params?.correo || '';
  const [correo, setCorreo] = useState(initialCorreo);
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onConfirm = async () => {
    if (!correo.trim() || !codigo.trim() || !nuevaPassword.trim()) {
      Alert.alert('Campos requeridos', 'Completa correo, código y nueva contraseña.');
      return;
    }

    try {
      setLoading(true);
      await confirmPasswordReset({ correo: correo.trim().toLowerCase(), codigo: codigo.trim(), nuevaPassword });
      Alert.alert('Listo', 'Contraseña actualizada. Ahora podés iniciar sesión.');
      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Confirmar restablecimiento</Text>

        <View style={styles.form}>
          <AppInput value={correo} onChangeText={setCorreo} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" />
          <AppInput value={codigo} onChangeText={setCodigo} placeholder="Código (6 dígitos)" keyboardType="numeric" />
          <AppInput value={nuevaPassword} onChangeText={setNuevaPassword} placeholder="Nueva contraseña" secureTextEntry />

          <AppButton title="Confirmar" onPress={onConfirm} loading={loading} />
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
