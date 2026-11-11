import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Acceso a la cuenta (público, orientado a producción).
 * - Iniciar sesión: POST /auth/login (email + contraseña) -> access_token.
 * - Crear cuenta:    POST /auth/register (email, contraseña, DNI, nombre…) -> access_token.
 * Al crear la cuenta quedas logueado automáticamente.
 */
const AuthLoginPanel = ({ onSuccess, compact = false }) => {
  const { login, register, authError, clearAuthError, loading } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    nombre_completo: '',
    dni: '',
    telefono: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const error = localError || authError;

  const switchMode = (next) => {
    setMode(next);
    setLocalError(null);
    setSuccessMessage(null);
    clearAuthError();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    const result = await login({ email: form.email.trim(), password: form.password });
    if (result.ok) onSuccess?.();
    else setLocalError(result.message);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    const passwordMin = 8;
    if (registerForm.password.length < passwordMin) {
      setLocalError(`La contraseña debe tener al menos ${passwordMin} caracteres.`);
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }
    if (!/^\d{7,20}$/.test(registerForm.dni.trim())) {
      setLocalError('El DNI debe contener solo dígitos (7-20 caracteres).');
      return;
    }

    const result = await register({
      email: registerForm.email.trim(),
      password: registerForm.password,
      nombre_completo: registerForm.nombre_completo.trim(),
      dni: registerForm.dni.trim(),
      telefono: registerForm.telefono,
    });
    if (result.ok) {
      setSuccessMessage('¡Cuenta creada! Ya iniciaste sesión.');
      if (mode === 'register') {
        // Pequeña pausa para que veas la confirmación antes de cerrar el modal.
        setTimeout(() => onSuccess?.(), 600);
      } else {
        onSuccess?.();
      }
    } else {
      setLocalError(result.message);
    }
  };

  const tabBase = 'flex-1 rounded-lg py-2 transition';
  const tabActive = 'bg-white shadow text-ec-ink';
  const tabInactive = 'text-ec-slate';

  return (
    <div className={compact ? 'space-y-4' : 'rounded-2xl border border-ec-mist bg-ec-mist/20 p-5 md:p-6 space-y-4'}>
      <div>
        <h3 className="font-extrabold text-ec-ink text-lg">
          {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
        </h3>
        <p className="text-sm text-ec-slate mt-1 leading-relaxed">
          {mode === 'login'
            ? 'Accede con tu email y contraseña para reservar.'
            : 'Regístrate en un minuto y empieza a reservar tus experiencias.'}
        </p>
      </div>

      <div className="flex rounded-xl bg-ec-mist p-1 text-sm font-bold" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onClick={() => switchMode('login')}
          className={`${tabBase} ${mode === 'login' ? tabActive : tabInactive}`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => switchMode('register')}
          className={`${tabBase} ${mode === 'register' ? tabActive : tabInactive}`}
        >
          Crear cuenta
        </button>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm" role="status">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm" role="alert">
          {error}
        </div>
      )}

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="text-sm font-bold text-ec-ink">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-ec-mist px-3 py-2 text-sm"
              placeholder="tu@correo.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="text-sm font-bold text-ec-ink">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-ec-mist px-3 py-2 text-sm"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
          <p className="text-xs text-ec-slate text-center">
            ¿Aún no tienes cuenta? Usa la pestaña <strong>Crear cuenta</strong>.
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-nombre" className="text-sm font-bold text-ec-ink">Nombre completo</label>
              <input
                id="reg-nombre"
                type="text"
                autoComplete="name"
                className="mt-1 w-full rounded-xl border border-ec-mist px-3 py-2 text-sm"
                placeholder="Juan Pérez"
                value={registerForm.nombre_completo}
                onChange={(e) => setRegisterForm((f) => ({ ...f, nombre_completo: e.target.value }))}
                required
                maxLength={150}
              />
            </div>
            <div>
              <label htmlFor="reg-dni" className="text-sm font-bold text-ec-ink">DNI / Cédula</label>
              <input
                id="reg-dni"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-ec-mist px-3 py-2 text-sm"
                placeholder="1723456789"
                value={registerForm.dni}
                onChange={(e) => setRegisterForm((f) => ({ ...f, dni: e.target.value.replace(/\D/g, '') }))}
                required
                maxLength={20}
              />
            </div>
          </div>
          <div>
            <label htmlFor="reg-telefono" className="text-sm font-bold text-ec-ink">
              Teléfono <span className="font-normal text-ec-slate">(opcional)</span>
            </label>
            <input
              id="reg-telefono"
              type="tel"
              autoComplete="tel"
              className="mt-1 w-full rounded-xl border border-ec-mist px-3 py-2 text-sm"
              placeholder="+593 98 765 4321"
              value={registerForm.telefono}
              onChange={(e) => setRegisterForm((f) => ({ ...f, telefono: e.target.value }))}
              maxLength={20}
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="text-sm font-bold text-ec-ink">Email</label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-ec-mist px-3 py-2 text-sm"
              placeholder="tu@correo.com"
              value={registerForm.email}
              onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-password" className="text-sm font-bold text-ec-ink">Contraseña</label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl border border-ec-mist px-3 py-2 text-sm"
                placeholder="Mínimo 8 caracteres"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
                maxLength={72}
              />
            </div>
            <div>
              <label htmlFor="reg-confirm" className="text-sm font-bold text-ec-ink">Confirmar contraseña</label>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl border border-ec-mist px-3 py-2 text-sm"
                placeholder="Repite la contraseña"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                required
                minLength={8}
                maxLength={72}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
      )}
    </div>
  );
};

export default AuthLoginPanel;