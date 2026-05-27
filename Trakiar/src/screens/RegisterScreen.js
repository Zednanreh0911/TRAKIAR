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
        <View style={styles.content}>
          <SafeAreaView style={styles.topSafeArea}>
            <View style={styles.topSection}>
              <MaterialCommunityIcons name="cube-outline" size={42} color={colors.primaryDark} />
            </View>
          </SafeAreaView>

          <View style={styles.sheet}>
            <Text style={styles.brandTitle}>Trakiar</Text>

            <View style={styles.form}>
              <AppInput
                value={nombre}
                onChangeText={setNombre}
                placeholder="Name"
                style={styles.loginInput}
              />
              <AppInput
                value={correo}
                onChangeText={setCorreo}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                style={styles.loginInput}
              />
              <AppInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Contraseña"
                style={styles.loginInput}
                rightIconName={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPressRightIcon={() => setShowPassword((prev) => !prev)}
              />
              <AppInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                placeholder="Confirmar Contraseña"
                style={styles.loginInput}
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

              <AppButton
                title="Registrarse"
                onPress={onRegister}
                loading={loading}
                style={styles.primaryButton}
              />
              <AppButton
                title="Iniciar sesión"
                variant="secondary"
                onPress={() => navigation.goBack()}
                style={styles.secondaryButton}
                labelStyle={styles.secondaryLabel}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContainer: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  content: { flex: 1, backgroundColor: colors.background },
  topSafeArea: {
    backgroundColor: colors.primary,
  },
  topSection: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingTop: 96,
    paddingBottom: 96,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderTopWidth: 1,
    borderTopColor: 'rgba(11, 31, 59, 0.12)',
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 36,
    flex: 1,
    flexGrow: 1,
    marginTop: -24,
    shadowColor: '#0B1F3B',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
    marginBottom: 18,
  },
  form: { gap: 14 },
  loginInput: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryButton: {
    borderRadius: 22,
  },
  secondaryButton: {
    borderRadius: 22,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  secondaryLabel: {
    color: colors.text,
  },
});
