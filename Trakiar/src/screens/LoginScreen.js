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
        <SafeAreaView style={styles.flex}>
          <View style={styles.content}>
            <View style={styles.header}>
              <MaterialCommunityIcons name="cube-outline" size={56} color={colors.primary} />
              <Text style={styles.brandTitle}>Trakiar</Text>
              <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
            </View>

            <View style={styles.form}>
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

              <View style={styles.buttonsContainer}>
                <AppButton
                  title="Iniciar sesión"
                  onPress={onLogin}
                  loading={loading}
                />
                
                <AppButton
                  title="Iniciar con Google"
                  variant="secondary"
                  iconName="google"
                  onPress={() => {
                    if (!canUseGoogleProxy) {
                      Alert.alert(
                        'Google login',
                        'Para usar Google en Expo Go necesitas un proyecto de Expo con nombre @owner/slug.'
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
                />
                
                <AppButton
                  title="Crear cuenta"
                  variant="secondary"
                  onPress={() => navigation.navigate('Register')}
                />
              </View>

              <Text style={styles.forgot} onPress={() => navigation.navigate('PasswordResetRequest')}>
                ¿Olvidaste tu contraseña?
              </Text>
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
    marginBottom: 48,
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
  forgot: {
    color: colors.primary,
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '600',
    fontSize: 15,
  },
});
