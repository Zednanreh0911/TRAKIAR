import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedEntrance from '../components/AnimatedEntrance';
import AppCard from '../components/AppCard';
import AppHeroHeader from '../components/AppHeroHeader';
import AppScreen from '../components/AppScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();

  const isManager = user?.rol === 'gerente';
  const roleLabel = user?.rol || 'usuario';
  const correo = user?.correo || 'Sin correo';
  const tipoLinea = user?.tipoLinea || 'natural';
  const tipoLineaLabel = tipoLinea === 'estudiantes' ? 'Estudiante' : 'Natural';

  const formatRole = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return '';
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const MenuRow = ({ title, icon, onPress, tone = 'default' }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
    >
      <View style={styles.menuLeft}>
        <View style={[styles.menuIconWrap, tone === 'danger' && styles.menuIconWrapDanger]}>
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={tone === 'danger' ? colors.danger : colors.textLight}
          />
        </View>
        <Text style={[styles.menuLabel, tone === 'danger' && styles.menuLabelDanger]}>{title}</Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={tone === 'danger' ? colors.danger : colors.textMuted}
      />
    </Pressable>
  );

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
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>{formatRole(roleLabel)}</Text>
            </View>
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>{correo}</Text>
            </View>
            <View style={styles.infoPillAlt}>
              <Text style={styles.infoPillTextAlt}>Estatus actual: {tipoLineaLabel}</Text>
            </View>
          </AppCard>
        </AnimatedEntrance>

        <AnimatedEntrance delay={100}>
          <AppCard style={styles.menuCard}>
            {isManager ? (
              <MenuRow
                title="Herramientas de gerente"
                icon="toolbox-outline"
                onPress={() => navigation.navigate('ManagerTools')}
              />
            ) : null}
            <MenuRow
              title="Cambiar contraseña"
              icon="lock-reset"
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <MenuRow
              title="Cambiar estatus"
              icon="account-switch"
              onPress={() => navigation.navigate('ChangeStatus')}
            />
            <MenuRow title="Cerrar sesión" icon="logout" onPress={signOut} tone="danger" />
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
    paddingTop: Platform.select({ ios: 1, android: 50, default: 50 }),
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
  infoPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  infoPillAlt: {
    alignSelf: 'flex-start',
    backgroundColor: '#EC83051A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  infoPillText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  infoPillTextAlt: {
    color: colors.warning,
    fontWeight: '700',
    fontSize: 13,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowPressed: {
    backgroundColor: colors.primarySoft,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  menuIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  menuIconWrapDanger: {
    backgroundColor: '#EC83051A',
  },
  menuLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  menuLabelDanger: {
    color: colors.danger,
  },
});
