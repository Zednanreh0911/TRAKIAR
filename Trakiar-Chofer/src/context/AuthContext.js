import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getDriverProfile, loginUser } from '../services/apiService';
import { clearToken, getToken, saveToken } from '../services/storageService';

const AuthContext = createContext(null);

const decodeAndValidateDriver = (token) => {
  const payload = jwtDecode(token);

  if (payload?.rol !== 'chofer') {
    throw new Error('Esta app es exclusiva para choferes.');
  }

  return {
    id: payload?.id,
    rol: payload?.rol,
    nombre: payload?.nombre || 'Chofer',
    unidad: null,
  };
};

const buildUserFromProfile = (fallbackUser, profileData) => {
  const chofer = profileData?.chofer;
  const unidad = profileData?.unidad || null;

  return {
    ...fallbackUser,
    nombre: chofer?.nombre || fallbackUser?.nombre || 'Chofer',
    unidad,
  };
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await getToken();

        if (!storedToken) {
          return;
        }

        const driverUser = decodeAndValidateDriver(storedToken);
        const profileData = await getDriverProfile(storedToken);
        const hydratedUser = buildUserFromProfile(driverUser, profileData);

        setToken(storedToken);
        setUser(hydratedUser);
      } catch {
        await clearToken();
        setToken(null);
        setUser(null);
      } finally {
        setBooting(false);
      }
    };

    restoreSession();
  }, []);

  const signIn = async ({ correo, password }) => {
    const data = await loginUser({ correo, password });

    if (!data?.token) {
      throw new Error('No se recibió token válido del servidor.');
    }

    const driverUser = decodeAndValidateDriver(data.token);
  const profileData = await getDriverProfile(data.token);
  const hydratedUser = buildUserFromProfile(driverUser, profileData);

    await saveToken(data.token);
    setToken(data.token);
  setUser(hydratedUser);

    return data;
  };

  const signOut = async () => {
    await clearToken();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      booting,
      signIn,
      signOut,
    }),
    [token, user, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
};
