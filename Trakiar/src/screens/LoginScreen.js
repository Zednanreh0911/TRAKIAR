import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { getErrorText } from '../utils/error';
import { colors } from '../theme/colors';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

              <AppButton
                title="Iniciar sesión"
                onPress={onLogin}
                loading={loading}
                style={styles.primaryButton}
              />
              <AppButton
                title="Registrarse"
                variant="secondary"
                onPress={() => navigation.navigate('Register')}
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
