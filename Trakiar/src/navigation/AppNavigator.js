import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, StyleSheet, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import FavoritesScreen from '../screens/FavoritesScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import ManagerToolsScreen from '../screens/ManagerToolsScreen';
import ManagerStatsScreen from '../screens/ManagerStatsScreen';
import PdfReportsScreen from '../screens/PdfReportsScreen';
import PeopleManagementScreen from '../screens/PeopleManagementScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RouteSearchScreen from '../screens/RouteSearchScreen';
import RoutesCatalogScreen from '../screens/RoutesCatalogScreen';
import RoutesManagementScreen from '../screens/RoutesManagementScreen';
import UnitsManagementScreen from '../screens/UnitsManagementScreen';
import ActiveRoutesLiveScreen from '../screens/ActiveRoutesLiveScreen';
import UserMapScreen from '../screens/UserMapScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();
const NativeTab = createNativeBottomTabNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: colors.surface,
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

function NativeMainTabs() {
  return (
    <NativeTab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerShown: false,
        translucent: true,
        minimizeBehavior: 'automatic',
        tabBarStyle: {
          backgroundColor: colors.surface,
        },
        tabBarActiveTintColor: colors.warning,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused }) => {
          const icons = {
            HomeTab: focused ? 'house.fill' : 'house',
            FavoritesTab: focused ? 'heart.fill' : 'heart',
            RoutesTab: focused ? 'map.fill' : 'map',
            ProfileTab: focused ? 'person.crop.circle.fill' : 'person.crop.circle',
          };

          return { sfSymbol: icons[route.name] || 'circle' };
        },
      })}
    >
      <NativeTab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Inicio', headerTitle: 'Inicio' }} />
      <NativeTab.Screen name="FavoritesTab" component={FavoritesScreen} options={{ title: 'Favoritos', headerTitle: 'Favoritos' }} />
      <NativeTab.Screen name="RoutesTab" component={RoutesCatalogScreen} options={{ title: 'Rutas', headerTitle: 'Rutas' }} />
      <NativeTab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Perfil', headerTitle: 'Perfil' }} />
    </NativeTab.Navigator>
  );
}

function JsMainTabs() {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 56 + safeBottom,
          paddingBottom: safeBottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.warning,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: -2,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            HomeTab: 'home-variant-outline',
            FavoritesTab: 'heart-outline',
            RoutesTab: 'map-marker-path',
            ProfileTab: 'account-circle-outline',
          };

          return (
            <View style={styles.tabIconWrap}>
              <View style={[styles.tabIndicator, focused && styles.tabIndicatorActive]} />
              <MaterialCommunityIcons name={icons[route.name] || 'circle-outline'} size={size} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Inicio', headerTitle: 'Inicio' }} />
      <Tab.Screen name="FavoritesTab" component={FavoritesScreen} options={{ title: 'Favoritos', headerTitle: 'Favoritos' }} />
      <Tab.Screen name="RoutesTab" component={RoutesCatalogScreen} options={{ title: 'Rutas', headerTitle: 'Rutas' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Perfil', headerTitle: 'Perfil' }} />
    </Tab.Navigator>
  );
}

const canUseNativeIosTabs = () => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return Boolean(UIManager.getViewManagerConfig?.('RNCTabView'));
  } catch {
    return false;
  }
};

function MainTabs() {
  if (canUseNativeIosTabs()) {
    return <NativeMainTabs />;
  }

  return <JsMainTabs />;
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
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="UserMap" component={UserMapScreen} options={{ title: 'Mapa en vivo' }} />
          <Stack.Screen name="RouteSearch" component={RouteSearchScreen} options={{ title: 'Buscar rutas' }} />
          {isManager ? (
            <>
              <Stack.Screen
                name="ManagerTools"
                component={ManagerToolsScreen}
                options={{ title: 'Gestión de operaciones', headerShown: false }}
              />
              <Stack.Screen
                name="PeopleManagement"
                component={PeopleManagementScreen}
                options={{ title: 'Gestión de personas', headerShown: false }}
              />
              <Stack.Screen
                name="UnitsManagement"
                component={UnitsManagementScreen}
                options={{ title: 'Gestión de unidades', headerShown: false }}
              />
              <Stack.Screen
                name="RoutesManagement"
                component={RoutesManagementScreen}
                options={{ title: 'Gestión de rutas', headerShown: false }}
              />
              <Stack.Screen
                name="ActiveRoutesLive"
                component={ActiveRoutesLiveScreen}
                options={{ title: 'Rutas activas en vivo', headerShown: false }}
              />
              <Stack.Screen
                name="ManagerStats"
                component={ManagerStatsScreen}
                options={{ title: 'Estadísticas operativas', headerShown: false }}
              />
              <Stack.Screen
                name="PdfReports"
                component={PdfReportsScreen}
                options={{ title: 'Reportes PDF', headerShown: false }}
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
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabIndicator: {
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.warning,
    opacity: 0,
  },
  tabIndicatorActive: {
    opacity: 1,
  },
});
