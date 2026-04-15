import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const isManager = user?.rol === 'gerente';

  const onSignOut = async () => {
    await signOut();
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>¡Bienvenido a Trakiar!</Text>
          <Text style={styles.subtitle}>
            Gestiona tu cuenta y consulta tus acciones disponibles según tu rol.
          </Text>
        </View>

        <AppCard>
          <Text style={styles.sectionTitle}>Tu cuenta</Text>
          <Text style={styles.detail}>Rol actual: <Text style={styles.strong}>{user?.rol || 'usuario'}</Text></Text>
          <Text style={styles.detail}>ID de usuario: <Text style={styles.strong}>{user?.id || 'N/D'}</Text></Text>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Operaciones</Text>
          <View style={styles.gap10}>
            <Text style={styles.detail}>Busca rutas por línea o por palabras del recorrido (ej. ferrero tamayo).</Text>
            <AppButton
              title="Buscar rutas"
              variant="secondary"
              onPress={() => navigation.navigate('RouteSearch')}
            />
          </View>

          {isManager ? (
            <View style={styles.gap10}>
              <Text style={styles.detail}>Como gerente puedes gestionar choferes, unidades y rutas.</Text>
              <AppButton
                title="Abrir herramientas de gerente"
                variant="secondary"
                onPress={() => navigation.navigate('ManagerTools')}
              />
            </View>
          ) : (
            <Text style={[styles.detail, styles.nonManagerText]}>
              Tu cuenta no tiene funciones administrativas. Si necesitas permisos de gerente, solicita autorización al administrador.
            </Text>
          )}

          <View style={styles.signOutWrap}>
            <AppButton title="Cerrar sesión" variant="secondary" onPress={onSignOut} />
          </View>
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
    gap: 14,
  },
  hero: {
    gap: 6,
    marginTop: 6,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  detail: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  strong: {
    color: colors.text,
    fontWeight: '700',
  },
  gap10: {
    gap: 10,
  },
  nonManagerText: {
    marginTop: 12,
  },
  signOutWrap: {
    marginTop: 14,
  },
});
