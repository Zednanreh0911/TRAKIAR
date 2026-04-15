import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import ManagerToolsScreen from '../screens/ManagerToolsScreen';
import PeopleManagementScreen from '../screens/PeopleManagementScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RouteSearchScreen from '../screens/RouteSearchScreen';
import RoutesManagementScreen from '../screens/RoutesManagementScreen';
import UnitsManagementScreen from '../screens/UnitsManagementScreen';
import ActiveRoutesLiveScreen from '../screens/ActiveRoutesLiveScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: '#fff',
  },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  headerTitleStyle: {
    fontWeight: '700',
  },
  contentStyle: {
    backgroundColor: colors.background,
  },
};

function SplashScreen() {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function AppNavigator() {
  const { token, user, loadingSession } = useAuth();
  const isManager = user?.rol === 'gerente';

  if (loadingSession) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {!token ? (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Bienvenido a Trakiar' }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Crear cuenta' }} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Panel principal' }} />
          <Stack.Screen name="RouteSearch" component={RouteSearchScreen} options={{ title: 'Buscar rutas' }} />
          {isManager ? (
            <>
              <Stack.Screen
                name="ManagerTools"
                component={ManagerToolsScreen}
                options={{ title: 'Gestión de operaciones' }}
              />
              <Stack.Screen
                name="PeopleManagement"
                component={PeopleManagementScreen}
                options={{ title: 'Gestión de personas' }}
              />
              <Stack.Screen
                name="UnitsManagement"
                component={UnitsManagementScreen}
                options={{ title: 'Gestión de unidades' }}
              />
              <Stack.Screen
                name="RoutesManagement"
                component={RoutesManagementScreen}
                options={{ title: 'Gestión de rutas' }}
              />
              <Stack.Screen
                name="ActiveRoutesLive"
                component={ActiveRoutesLiveScreen}
                options={{ title: 'Rutas activas en vivo' }}
              />
            </>
          ) : null}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
