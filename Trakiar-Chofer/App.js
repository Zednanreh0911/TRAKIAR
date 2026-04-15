import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import DriverHomeScreen from './src/screens/DriverHomeScreen';
import LoginScreen from './src/screens/LoginScreen';

function RootScreen() {
  const { booting, token } = useAuth();

  if (booting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6BFF" />
      </View>
    );
  }

  return (
    <>
      {token ? <DriverHomeScreen /> : <LoginScreen />}
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootScreen />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F6F8FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
