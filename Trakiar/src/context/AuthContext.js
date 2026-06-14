import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  changeMyPassword as changeMyPasswordApi,
  googleLogin,
  loginUser,
  toggleMyStatus as toggleMyStatusApi,
  updateMyProfile,
} from '../services/apiService';
import { clearToken, clearUserMeta, getToken, getUserMeta, saveToken, saveUserMeta } from '../services/storageService';

const AuthContext = createContext(null);

function resolveUser(token, meta = {}) {
  try {
    const payload = jwtDecode(token);
    return {
      id: payload?.id,
      rol: payload?.rol,
      nombre: payload?.nombre,
      tipoLinea: payload?.tipoLinea,
      correo: meta?.correo,
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
        const savedMeta = await getUserMeta();
        if (savedToken) {
          const resolvedUser = resolveUser(savedToken, savedMeta || {});
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
        await saveUserMeta({ correo });
        const resolvedUser = resolveUser(data.token, { correo });
        setToken(data.token);
        setUser(resolvedUser);
        return data;
      },
      signInWithGoogle: async ({ id_token, correo }) => {
        const googlePayload = jwtDecode(id_token);
        const data = await googleLogin({ id_token });
        if (!data?.token) {
          throw new Error('El backend no devolvió token');
        }

        await saveToken(data.token);
        const email = correo || googlePayload?.email;
        if (email) {
          await saveUserMeta({ correo: email });
        }
        const resolvedUser = resolveUser(data.token, email ? { correo: email } : {});
        setToken(data.token);
        setUser(resolvedUser);
        return data;
      },
      completeMyProfile: async ({ tipoLinea }) => {
        const currentToken = await getToken();
        if (!currentToken) {
          throw new Error('No hay sesión activa');
        }

        const data = await updateMyProfile(currentToken, { tipoLinea });
        if (!data?.token) {
          throw new Error('El backend no devolvió token actualizado');
        }

        await saveToken(data.token);
        const resolvedUser = resolveUser(data.token, { correo: user?.correo });
        setToken(data.token);
        setUser(resolvedUser);
        return data;
      },
      changeMyPassword: async ({ currentPassword, newPassword }) => {
        const currentToken = await getToken();
        if (!currentToken) {
          throw new Error('No hay sesión activa');
        }

        const data = await changeMyPasswordApi(currentToken, { currentPassword, newPassword });
        return data;
      },
      toggleMyStatus: async () => {
        const currentToken = await getToken();
        if (!currentToken) {
          throw new Error('No hay sesión activa');
        }

        const data = await toggleMyStatusApi(currentToken);
        if (!data?.token) {
          throw new Error('El backend no devolvió token actualizado');
        }

        await saveToken(data.token);
        const resolvedUser = resolveUser(data.token, { correo: user?.correo });
        setToken(data.token);
        setUser(resolvedUser);
        return data;
      },
      signOut: async () => {
        await clearToken();
        await clearUserMeta();
        setToken(null);
        setUser(null);
      },
      refreshSession: async () => {
        const savedToken = await getToken();
        const savedMeta = await getUserMeta();
        const resolvedUser = savedToken ? resolveUser(savedToken, savedMeta || {}) : null;
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
