import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppHeroHeader from '../components/AppHeroHeader';
import AppInput from '../components/AppInput';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ChangePasswordScreen({ navigation }) {
  const { changeMyPassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Faltan datos', 'Completa la contraseña actual y escribe la nueva dos veces.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Revisión requerida', 'Las nuevas contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      await changeMyPassword({ currentPassword, newPassword });
      Alert.alert('Listo', 'La contraseña se actualizó correctamente.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.error || 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeroHeader
          title="Cambiar contraseña"
          subtitle="Tu contraseña actual se usa para confirmar la actualización de forma segura."
        />

        <AppCard style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="lock-reset" size={22} color={colors.primaryDark} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Nueva contraseña</Text>
              <Text style={styles.subtitle}>
                Escribe la contraseña actual y confirma dos veces la nueva.
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <AppInput
              label="Contraseña actual"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Ingresa tu contraseña actual"
            />
            <AppInput
              label="Nueva contraseña"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Ingresa la nueva contraseña"
            />
            <AppInput
              label="Repetir nueva contraseña"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
              placeholder="Confirma la nueva contraseña"
            />
            <AppButton title="Actualizar contraseña" onPress={onSubmit} loading={loading} iconName="content-save" />
          </View>
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 24,
    paddingTop: Platform.select({ ios: 1, android: 50, default: 50 }),
  },
  card: {
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 18,
  },
  form: {
    gap: 12,
  },
});
