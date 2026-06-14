import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { getErrorText } from '../utils/error';
import { colors } from '../theme/colors';
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_PROXY_PROJECT_NAME,
  GOOGLE_PROXY_REDIRECT_URI,
  GOOGLE_WEB_CLIENT_ID,
} from '../config/auth';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const { signIn, signInWithGoogle } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const canUseGoogleProxy = Boolean(GOOGLE_PROXY_PROJECT_NAME?.trim());

  const [googleRequest, , promptGoogleAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    expoClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    redirectUri: GOOGLE_PROXY_REDIRECT_URI || undefined,
  });

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
                title="Iniciar con Google"
                variant="secondary"
                onPress={() => {
                  if (!canUseGoogleProxy) {
                    Alert.alert(
                      'Google login',
                      'Para usar Google en Expo Go necesitas un proyecto de Expo con nombre @owner/slug. Sin eso, usa un development build o crea una cuenta gratuita de Expo.'
                    );
                    return;
                  }

                  (async () => {
                    try {
                      setLoading(true);
                      const result = await promptGoogleAsync({
                        projectNameForProxy: GOOGLE_PROXY_PROJECT_NAME,
                      });

                      if (result?.type !== 'success') {
                        Alert.alert('Google', 'No se pudo completar el inicio con Google.');
                        return;
                      }

                      const idToken = result?.params?.id_token || result?.authentication?.idToken;
                      if (!idToken) {
                        Alert.alert('Google', 'No se recibió el token de Google.');
                        return;
                      }

                      await signInWithGoogle({ id_token: idToken, correo });
                      Alert.alert('Sesión iniciada', 'Bienvenido con Google.');
                    } catch (error) {
                      Alert.alert('No se pudo iniciar con Google', getErrorText(error));
                    } finally {
                      setLoading(false);
                    }
                  })();
                }}
                disabled={!googleRequest || !canUseGoogleProxy}
                style={styles.secondaryButton}
                labelStyle={styles.secondaryLabel}
              />
              <AppButton
                title="Registrarse"
                variant="secondary"
                onPress={() => navigation.navigate('Register')}
                style={styles.secondaryButton}
                labelStyle={styles.secondaryLabel}
              />
              <Text style={styles.forgot} onPress={() => navigation.navigate('PasswordResetRequest')}>¿Olvidaste tu contraseña?</Text>
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
  forgot: {
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
});
