import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppButton from '../components/AppButton';
import AppDropdown from '../components/AppDropdown';
import AppInput from '../components/AppInput';
import AppScreen from '../components/AppScreen';
import { registerUser } from '../services/apiService';
import { colors } from '../theme/colors';
import { getErrorText } from '../utils/error';

export default function RegisterScreen({ navigation }) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tipoLinea, setTipoLinea] = useState('natural');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!nombre || !correo || !password || !confirmPassword) {
      Alert.alert('Campos obligatorios', 'Completa nombre, correo, contraseña y confirmación.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Contraseñas no coinciden', 'Revisa la contraseña y su confirmación.');
      return;
    }

    try {
      setLoading(true);
      await registerUser({ nombre, correo, password, tipoLinea });
      Alert.alert('Cuenta creada', 'Ahora puedes iniciar sesión con tu correo.');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('No se pudo registrar', getErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen containerStyle={styles.screenContainer}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.content}>
            <View style={styles.header}>
              <MaterialCommunityIcons name="account-plus-outline" size={56} color={colors.primary} />
              <Text style={styles.brandTitle}>Crear Cuenta</Text>
              <Text style={styles.subtitle}>Únete a Trakiar hoy</Text>
            </View>

            <View style={styles.form}>
              <AppInput
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre completo"
              />
              <AppInput
                value={correo}
                onChangeText={setCorreo}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
              />
              <AppInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Contraseña"
                rightIconName={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPressRightIcon={() => setShowPassword((prev) => !prev)}
              />
              <AppInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                placeholder="Confirmar Contraseña"
                rightIconName={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPressRightIcon={() => setShowPassword((prev) => !prev)}
              />

              <AppDropdown
                label="¿Eres estudiante?"
                value={tipoLinea}
                onChange={setTipoLinea}
                options={[
                  { label: 'No', value: 'natural', leftIconName: 'account' },
                  { label: 'Sí', value: 'estudiantes', leftIconName: 'school' },
                ]}
              />

              <View style={styles.buttonsContainer}>
                <AppButton
                  title="Registrarse"
                  onPress={onRegister}
                  loading={loading}
                />
                <AppButton
                  title="Ya tengo cuenta"
                  variant="secondary"
                  onPress={() => navigation.goBack()}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 8,
  },
  form: { 
    gap: 16 
  },
  buttonsContainer: {
    gap: 12,
    marginTop: 16,
  },
});
