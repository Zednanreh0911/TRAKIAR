import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppInput from '../components/AppInput';
import AppScreen from '../components/AppScreen';
import { registerUser } from '../services/apiService';
import { colors } from '../theme/colors';
import { getErrorText } from '../utils/error';

export default function RegisterScreen({ navigation }) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!nombre || !correo || !password) {
      Alert.alert('Campos obligatorios', 'Completa nombre, correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      await registerUser({ nombre, correo, password });
      Alert.alert('Cuenta creada', 'Ahora puedes iniciar sesión con tu correo.');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('No se pudo registrar', getErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.title}>Crea tu cuenta</Text>
            <Text style={styles.subtitle}>Registra tus datos para entrar al panel de operaciones.</Text>
          </View>

          <AppCard>
            <View style={styles.form}>
              <AppInput label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />
              <AppInput
                label="Correo"
                value={correo}
                onChangeText={setCorreo}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="tu@correo.com"
              />
              <AppInput
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
              />

              <AppButton title="Crear cuenta" onPress={onRegister} loading={loading} />
              <AppButton title="Ya tengo cuenta" variant="secondary" onPress={() => navigation.goBack()} />
            </View>
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 28, gap: 16 },
  hero: { marginTop: 6, gap: 6 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  form: { gap: 12 },
});
