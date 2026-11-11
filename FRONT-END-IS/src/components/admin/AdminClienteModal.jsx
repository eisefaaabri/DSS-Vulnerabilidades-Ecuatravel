import React, { useEffect, useId, useRef, useState } from 'react';
import { ClientesService } from '../../services/api';

const EMPTY_FORM = { nombre: '', email: '', identificacion: '', telefono: '', password: '' };

const field = 'w-full border border-ec-mist rounded-xl px-3 py-2.5 min-h-11 bg-white text-sm';

/** Alta de un cliente desde el panel (p. ej., un turista que reserva en mostrador). */
const AdminClienteModal = ({ isOpen, onClose, onSaved }) => {
  const titleId = useId();
  const firstRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [conAcceso, setConAcceso] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setConAcceso(false);
    setError(null);
    const t = setTimeout(() => firstRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (conAcceso && form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const creado = await ClientesService.create({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        identificacion: form.identificacion.trim(),
        ...(form.telefono.trim() && { telefono: form.telefono.trim() }),
        ...(conAcceso && { password: form.password }),
      });
      onSaved?.(creado);
      onClose();
    } catch (err) {
      setError(err?.userMessage || err?.message || 'No se pudo registrar el cliente.');
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
              Nuevo cliente
            </h2>
            <p className="text-xs text-ec-slate mt-0.5">Se crea con su perfil de facturación.</p>
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
            <label htmlFor="cli-nombre" className="text-sm font-bold text-ec-ink">
              Nombre completo
            </label>
            <input
              id="cli-nombre"
              ref={firstRef}
              required
              minLength={2}
              autoComplete="off"
              placeholder="Ej. María José Flores"
              className={field}
              value={form.nombre}
              onChange={setField('nombre')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cli-identificacion" className="text-sm font-bold text-ec-ink">
                Cédula, RUC o pasaporte
              </label>
              <input
                id="cli-identificacion"
                required
                pattern="[A-Za-z0-9]{5,20}"
                title="Entre 5 y 20 letras o números"
                autoComplete="off"
                placeholder="1724589633"
                className={field}
                value={form.identificacion}
                onChange={setField('identificacion')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cli-telefono" className="text-sm font-bold text-ec-ink">
                Teléfono <span className="text-xs font-normal text-ec-slate">(opcional)</span>
              </label>
              <input
                id="cli-telefono"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="+593991234567"
                className={field}
                value={form.telefono}
                onChange={setField('telefono')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cli-email" className="text-sm font-bold text-ec-ink">
              Correo electrónico
            </label>
            <input
              id="cli-email"
              type="email"
              required
              autoComplete="off"
              placeholder="turista@correo.com"
              className={field}
              value={form.email}
              onChange={setField('email')}
            />
          </div>

          <div className="rounded-xl border border-ec-mist bg-ec-mist/20 p-3">
            <label className="flex items-start gap-3 cursor-pointer min-h-11">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={conAcceso}
                onChange={(e) => setConAcceso(e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-bold text-ec-ink">Darle acceso a la web</span>
                <span className="block text-ec-slate">
                  Con una contraseña inicial podrá iniciar sesión y ver sus reservas.
                </span>
              </span>
            </label>
            {conAcceso && (
              <div className="mt-3 flex flex-col gap-1.5">
                <label htmlFor="cli-password" className="text-sm font-bold text-ec-ink">
                  Contraseña inicial
                </label>
                <input
                  id="cli-password"
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
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-3 border-t border-ec-mist/60 mt-2">
            <button type="button" onClick={onClose} disabled={saving} className="btn-secondary px-5 py-2.5 text-sm">
              Cancelar
            </button>
            <button type="submit" className="btn-primary px-6 py-2.5 text-sm font-bold" disabled={saving}>
              {saving ? 'Registrando…' : 'Registrar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminClienteModal;
