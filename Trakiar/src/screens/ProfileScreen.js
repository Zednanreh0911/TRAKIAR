import { StyleSheet, Text, View } from 'react-native';
import AnimatedEntrance from '../components/AnimatedEntrance';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppHeroHeader from '../components/AppHeroHeader';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const isManager = user?.rol === 'gerente';

  return (
    <AppScreen>
      <View style={styles.content}>
        <AnimatedEntrance>
          <AppHeroHeader
            title="Perfil"
            subtitle="Administra tu sesión y accede rápidamente a tus herramientas."
          />
        </AnimatedEntrance>

        <AnimatedEntrance delay={70}>
          <AppCard>
            <Text style={styles.sectionTitle}>Tu cuenta</Text>
            <Text style={styles.detail}>Rol: <Text style={styles.strong}>{user?.rol || 'usuario'}</Text></Text>
            <Text style={styles.detail}>ID: <Text style={styles.strong}>{user?.id || 'N/D'}</Text></Text>
          </AppCard>
        </AnimatedEntrance>

        {isManager ? (
          <AnimatedEntrance delay={110}>
            <AppCard>
              <Text style={styles.sectionTitle}>Gerencia</Text>
              <Text style={styles.detail}>Accede a la administración de personal, unidades y rutas.</Text>
              <View style={styles.actionWrap}>
                <AppButton
                  title="Abrir herramientas de gerente"
                  variant="secondary"
                  iconName="toolbox-outline"
                  onPress={() => navigation.navigate('ManagerTools')}
                />
              </View>
            </AppCard>
          </AnimatedEntrance>
        ) : null}

        <AnimatedEntrance delay={140}>
          <AppCard>
            <Text style={styles.sectionTitle}>Sesión</Text>
            <Text style={styles.detail}>Si compartes tu teléfono, recuerda cerrar sesión al terminar.</Text>
            <View style={styles.actionWrap}>
              <AppButton title="Cerrar sesión" variant="secondary" iconName="logout" onPress={signOut} />
            </View>
          </AppCard>
        </AnimatedEntrance>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
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
  actionWrap: {
    marginTop: 12,
  },
});
