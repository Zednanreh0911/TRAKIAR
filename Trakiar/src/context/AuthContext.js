import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { loginUser } from '../services/apiService';
import { clearToken, getToken, saveToken } from '../services/storageService';

const AuthContext = createContext(null);

function resolveUser(token) {
  try {
    const payload = jwtDecode(token);
    return {
      id: payload?.id,
      rol: payload?.rol,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const savedToken = await getToken();
        if (savedToken) {
          const resolvedUser = resolveUser(savedToken);
          setToken(savedToken);
          setUser(resolvedUser);
        }
      } finally {
        setLoadingSession(false);
      }
    };

    bootstrap();
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loadingSession,
      signIn: async ({ correo, password }) => {
        const data = await loginUser({ correo, password });
        if (!data?.token) {
          throw new Error('El backend no devolvió token');
        }

        await saveToken(data.token);
  const resolvedUser = resolveUser(data.token);
        setToken(data.token);
        setUser(resolvedUser);
        return data;
      },
      signOut: async () => {
        await clearToken();
        setToken(null);
        setUser(null);
      },
      refreshSession: async () => {
        const savedToken = await getToken();
        const resolvedUser = savedToken ? resolveUser(savedToken) : null;
        setToken(savedToken);
        setUser(resolvedUser);
      },
    }),
    [loadingSession, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
