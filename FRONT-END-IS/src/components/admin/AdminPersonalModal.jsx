import React, { useEffect, useId, useRef, useState } from 'react';
import { PersonalService } from '../../services/api';

const EMPTY_FORM = {
  email: '',
  password: '',
  rol: 'OPERADOR',
  nombre_completo: '',
  telefono: '',
};

const field = 'w-full border border-ec-mist rounded-xl px-3 py-2.5 min-h-11 bg-white text-sm';

/** Alta de una cuenta de personal (administrador u operador/guía). */
const AdminPersonalModal = ({ isOpen, onClose, onSaved }) => {
  const titleId = useId();
  const emailInputRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setError(null);
    const t = setTimeout(() => emailInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await PersonalService.create({
        email: form.email.trim(),
        password: form.password,
        nombre_completo: form.nombre_completo.trim(),
        rol: form.rol,
        ...(form.telefono.trim() && { telefono: form.telefono.trim() }),
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.userMessage || err?.message || 'No se pudo crear la cuenta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="fixed inset-0 bg-ec-ink/70 backdrop-blur-sm cursor-default"
        aria-label="Cerrar"
        onClick={() => !saving && onClose()}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-ec-mist bg-white shadow-ec-card animate-fade-in"
      >
        <div className="flex items-center justify-between gap-4 border-b border-ec-mist px-5 py-4 md:px-6">
          <div>
            <h2 id={titleId} className="text-2xl md:text-3xl leading-tight text-ec-ink">
              Nueva cuenta de personal
            </h2>
            <p className="text-xs text-ec-slate mt-0.5">Para administradores y guías. Los turistas se registran en la tienda.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ec-slate hover:bg-ec-mist/70 hover:text-ec-ink disabled:opacity-50"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 md:p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-800 text-sm rounded-r-xl" role="alert">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="per-nombre" className="text-sm font-bold text-ec-ink">
              Nombre completo
            </label>
            <input
              id="per-nombre"
              required
              minLength={2}
              autoComplete="name"
              placeholder="Ej. Carlos Andrade"
              className={field}
              value={form.nombre_completo}
              onChange={setField('nombre_completo')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="per-email" className="text-sm font-bold text-ec-ink">
              Correo electrónico
            </label>
            <input
              id="per-email"
              ref={emailInputRef}
              type="email"
              required
              autoComplete="off"
              placeholder="guia@ecuatravel.com"
              className={field}
              value={form.email}
              onChange={setField('email')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="per-password" className="text-sm font-bold text-ec-ink">
              Contraseña inicial
            </label>
            <input
              id="per-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className={field}
              value={form.password}
              onChange={setField('password')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="per-rol" className="text-sm font-bold text-ec-ink">
                Rol
              </label>
              <select id="per-rol" className={`${field} font-semibold`} value={form.rol} onChange={setField('rol')}>
                <option value="OPERADOR">OPERADOR (guía)</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="per-telefono" className="text-sm font-bold text-ec-ink">
                Teléfono <span className="text-xs font-normal text-ec-slate">(opcional)</span>
              </label>
              <input
                id="per-telefono"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+593987654321"
                className={field}
                value={form.telefono}
                onChange={setField('telefono')}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-3 border-t border-ec-mist/60 mt-2">
            <button type="button" onClick={onClose} disabled={saving} className="btn-secondary px-5 py-2.5 text-sm">
              Cancelar
            </button>
            <button type="submit" className="btn-primary px-6 py-2.5 text-sm font-bold" disabled={saving}>
              {saving ? 'Creando…' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPersonalModal;
