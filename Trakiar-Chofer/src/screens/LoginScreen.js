import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getErrorText } from '../utils/error';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleSubmit = async () => {
    if (!correo.trim() || !password.trim()) {
      setErrorText('Ingresa correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      setErrorText('');
      await signIn({ correo: correo.trim().toLowerCase(), password });
    } catch (error) {
      setErrorText(getErrorText(error, 'No se pudo iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trakiar Chofer</Text>
      <Text style={styles.subtitle}>Inicia sesión con tu cuenta de chofer</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          value={correo}
          onChangeText={setCorreo}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="chofer@correo.com"
          placeholderTextColor="#8c96a4"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="********"
          placeholderTextColor="#8c96a4"
        />

        {!!errorText && <Text style={styles.error}>{errorText}</Text>}

        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: '#F6F8FC',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A2A4A',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    textAlign: 'center',
    color: '#5E6A7D',
    marginBottom: 20,
  },
  form: {
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4EAF7',
  },
  label: {
    color: '#3A4760',
    fontWeight: '600',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DFE6F4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#1A2A4A',
    backgroundColor: '#FBFCFF',
  },
  error: {
    color: '#C63E3E',
    fontSize: 13,
  },
  button: {
    marginTop: 6,
    backgroundColor: '#2F6BFF',
    borderRadius: 12,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
