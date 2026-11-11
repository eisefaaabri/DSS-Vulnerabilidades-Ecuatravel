import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuthService,
  clearStoredToken,
  getStoredToken,
  persistAuthToken,
} from '../services/api';
import { parseJwtPayload, validateAuthToken } from '../utils/jwt';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => {
    const stored = getStoredToken();
    if (stored && !validateAuthToken(stored).ok) {
      clearStoredToken();
      return null;
    }
    return stored;
  });
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);

  const session = useMemo(() => {
    if (!token) return null;
    const validation = validateAuthToken(token);
    if (!validation.ok) return null;
    const { payload } = validation;
    const roles = payload.roles ?? (payload.rol ? [payload.rol] : []);
    return {
      userId: payload.sub,
      email: payload.email,
      roles,
      isAdmin: roles.includes('ADMIN'),
      // Personal de la tienda: entra a la zona /admin (el OPERADOR con acceso limitado).
      isStaff: roles.includes('ADMIN') || roles.includes('OPERADOR'),
    };
  }, [token]);

  useEffect(() => {
    const onExpired = () => setTokenState(null);
    window.addEventListener('auth:session-expired', onExpired);
    return () => window.removeEventListener('auth:session-expired', onExpired);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setTokenState(null);
    setAuthError(null);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await AuthService.login({ email, password });
      const rawToken = data?.access_token;
      if (!rawToken) {
        const message = 'El servidor no devolvió un token de acceso.';
        setAuthError(message);
        return { ok: false, message };
      }
      const validation = validateAuthToken(rawToken);
      if (!validation.ok) {
        setAuthError(validation.message);
        return { ok: false, message: validation.message };
      }
      persistAuthToken(rawToken);
      setTokenState(rawToken);
      return { ok: true, session: { userId: validation.payload.sub, email: validation.payload.email } };
    } catch (error) {
      const message = error?.userMessage || error?.message || 'No se pudo iniciar sesión.';
      setAuthError(message);
      return { ok: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async ({ email, password, nombre_completo, dni, telefono }) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await AuthService.register({ email, password, nombre_completo, dni, telefono });
      const rawToken = data?.access_token;
      if (!rawToken) {
        const message = 'El servidor no devolvió un token de acceso.';
        setAuthError(message);
        return { ok: false, message };
      }
      const validation = validateAuthToken(rawToken);
      if (!validation.ok) {
        setAuthError(validation.message);
        return { ok: false, message: validation.message };
      }
      persistAuthToken(rawToken);
      setTokenState(rawToken);
      return { ok: true, created: true, session: { userId: validation.payload.sub, email: validation.payload.email } };
    } catch (error) {
      const message = error?.userMessage || error?.message || 'No se pudo crear la cuenta.';
      setAuthError(message);
      return { ok: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const applyToken = useCallback((rawToken) => {
    const validation = validateAuthToken(rawToken);
    if (!validation.ok) {
      setAuthError(validation.message);
      return { ok: false, message: validation.message };
    }
    persistAuthToken(rawToken);
    setTokenState(rawToken);
    setAuthError(null);
    return {
      ok: true,
      session: { userId: validation.payload.sub, email: validation.payload.email },
    };
  }, []);

  const value = useMemo(
    () => ({
      token,
      session,
      isAuthenticated: Boolean(session),
      isAdmin: Boolean(session?.isAdmin),
      isStaff: Boolean(session?.isStaff),
      authError,
      loading,
      login,
      register,
      applyToken,
      logout,
      clearAuthError: () => setAuthError(null),
    }),
    [token, session, authError, loading, login, register, applyToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

/** Etiqueta corta para la barra de navegación. */
export function useAuthLabel() {
  const { session } = useAuth();
  if (!session?.email) return null;
  const payload = session.email;
  return payload.length > 24 ? `${payload.slice(0, 22)}…` : payload;
}

export function getSessionFromStorage() {
  const t = getStoredToken();
  if (!t) return null;
  const v = validateAuthToken(t);
  if (!v.ok) return null;
  return parseJwtPayload(t);
}
