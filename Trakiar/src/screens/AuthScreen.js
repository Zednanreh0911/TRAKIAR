import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AppDropdown from '../components/AppDropdown';
import { checkServer, getProtectedData, loginUser, registerUser } from '../services/apiService';
import { clearToken, getToken, saveToken } from '../services/storageService';
import { API_BASE_URL, SERVER_BASE_URL } from '../config/api';
import { colors } from '../theme/colors';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tipoLinea, setTipoLinea] = useState('natural');
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState('Sin acciones todavía.');

  const onRegister = async () => {
    if (!nombre || !correo || !password || !confirmPassword) {
      Alert.alert('Campos requeridos', 'Completa nombre, correo, contraseña y confirmación.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Contraseñas no coinciden', 'Revisa la contraseña y su confirmación.');
      return;
    }

    try {
      setLoading(true);
      const data = await registerUser({ nombre, correo, password, tipoLinea });
      setResponseText(`Registro exitoso:\n${JSON.stringify(data, null, 2)}`);
      Alert.alert('Listo', 'Usuario registrado correctamente.');
      setMode('login');
    } catch (error) {
      setResponseText(getErrorText(error));
      Alert.alert('Error al registrar', getErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  const onLogin = async () => {
    if (!correo || !password) {
      Alert.alert('Campos requeridos', 'Completa correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      const data = await loginUser({ correo, password });
      if (data?.token) {
        await saveToken(data.token);
      }
      setResponseText(`Login exitoso:\n${JSON.stringify(data, null, 2)}`);
      Alert.alert('Listo', 'Inicio de sesión exitoso.');
    } catch (error) {
      setResponseText(getErrorText(error));
      Alert.alert('Error al iniciar sesión', getErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  const onProtected = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      if (!token) {
        Alert.alert('Sin token', 'Primero inicia sesión para guardar un token.');
        return;
      }

      const data = await getProtectedData(token);
      setResponseText(`Ruta protegida:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResponseText(getErrorText(error));
      Alert.alert('Error en ruta protegida', getErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  const onCheckServer = async () => {
    try {
      setLoading(true);
      const data = await checkServer();
      setResponseText(`Servidor activo:\n${JSON.stringify(data, null, 2)}`);
      Alert.alert('Conexión OK', 'El backend respondió correctamente.');
    } catch (error) {
      setResponseText(getErrorText(error));
      Alert.alert('Sin conexión', getErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    await clearToken();
    Alert.alert('Sesión', 'Token eliminado localmente.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Trakiar Mobile</Text>
      <Text style={styles.subtitle}>Conectado a:</Text>
      <Text style={styles.endpoint}>{SERVER_BASE_URL}</Text>
      <Text style={styles.endpointSmall}>{API_BASE_URL}</Text>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, mode === 'login' && styles.tabActive]}
          onPress={() => setMode('login')}
        >
          <Text style={styles.tabText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, mode === 'register' && styles.tabActive]}
          onPress={() => setMode('register')}
        >
          <Text style={styles.tabText}>Registro</Text>
        </TouchableOpacity>
      </View>

      {mode === 'register' && (
        <>
          <TextInput
            placeholder="Nombre"
            value={nombre}
            onChangeText={setNombre}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
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
        </>
      )}

      <TextInput
        placeholder="Correo"
        value={correo}
        onChangeText={setCorreo}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      {mode === 'register' && (
        <TextInput
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={mode === 'login' ? onLogin : onRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.buttonText}>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onCheckServer} disabled={loading}>
        <Text style={styles.secondaryButtonText}>Probar conexión con backend</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onProtected} disabled={loading}>
        <Text style={styles.secondaryButtonText}>Llamar ruta protegida</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onLogout} disabled={loading}>
        <Text style={styles.secondaryButtonText}>Cerrar sesión local</Text>
      </TouchableOpacity>

      <Text style={styles.responseTitle}>Respuesta:</Text>
      <Text style={styles.responseText}>{responseText}</Text>
    </ScrollView>
  );
}

function getErrorText(error) {
  if (error?.response?.data) {
    return JSON.stringify(error.response.data);
  }

  if (error?.message) {
    return error.message;
  }

  return 'Error desconocido';
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  endpoint: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  endpointSmall: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
  },
  tabText: {
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: colors.background,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  responseTitle: {
    marginTop: 8,
    fontWeight: '700',
    color: colors.text,
  },
  responseText: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    minHeight: 90,
  },
});
