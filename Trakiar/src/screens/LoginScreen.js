import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppInput from '../components/AppInput';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { getErrorText } from '../utils/error';
import { colors } from '../theme/colors';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!correo || !password) {
      Alert.alert('Campos obligatorios', 'Completa correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      await signIn({ correo, password });
      Alert.alert('Sesión iniciada', 'Bienvenido de nuevo.');
    } catch (error) {
      Alert.alert('No se pudo iniciar sesión', getErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.title}>Ingresa a Trakiar</Text>
            <Text style={styles.subtitle}>Controla rutas, choferes y unidades desde una app más clara y rápida.</Text>
          </View>

          <AppCard>
            <View style={styles.form}>
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

              <AppButton title="Iniciar sesión" onPress={onLogin} loading={loading} />
              <AppButton title="Crear cuenta" variant="secondary" onPress={() => navigation.navigate('Register')} />
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
