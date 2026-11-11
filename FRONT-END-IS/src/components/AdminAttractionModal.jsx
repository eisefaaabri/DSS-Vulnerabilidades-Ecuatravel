import React, { useEffect, useId, useRef, useState } from 'react';
import { AtraccionesService } from '../services/api';
import { normalizeAtraccion } from '../utils/atraccion';

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  codigo_aeropuerto: '',
  precio_base: '',
  capacidad_diaria: '',
  duracion_horas: '',
  estado: 'ACTIVA',
  foto_url: '',
  incluye: '',
  itinerario: '',
};

const ESTADOS = ['ACTIVA', 'INACTIVA', 'MANTENIMIENTO'];

const fromAtraccion = (raw) => {
  const a = normalizeAtraccion(raw);
  if (!a) return { ...EMPTY_FORM };
  return {
    nombre: a.nombre ?? '',
    descripcion: a.descripcion ?? '',
    codigo_aeropuerto: a.codigo_aeropuerto ?? '',
    precio_base: a.precio_base != null ? String(a.precio_base) : '',
    capacidad_diaria: a.capacidad_diaria != null ? String(a.capacidad_diaria) : '',
    duracion_horas: a.duracion_horas != null ? String(a.duracion_horas) : '',
    estado: a.estado ?? 'ACTIVA',
    foto_url: a.foto ?? '',
    incluye: Array.isArray(a.incluye) ? a.incluye.join('\n') : '',
    itinerario: a.itinerario ?? '',
  };
};

/** Construye el payload respetando exactamente los campos del CreateAtraccionDto. */
const buildPayload = (form) => {
  const payload = {
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    codigo_aeropuerto: form.codigo_aeropuerto.trim().toUpperCase(),
    precio_base: Number(form.precio_base),
    capacidad_diaria: Number(form.capacidad_diaria),
  };
  if (form.estado) payload.estado = form.estado;
  if (form.foto_url.trim()) payload.foto_url = form.foto_url.trim();
  if (form.duracion_horas !== '') payload.duracion_horas = Number(form.duracion_horas);
  const incluye = form.incluye
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (incluye.length) payload.incluye = incluye;
  if (form.itinerario.trim()) payload.itinerario = form.itinerario.trim();
  return payload;
};

const AdminAttractionModal = ({ isOpen, atraccion, onClose, onSaved }) => {
  const titleId = useId();
  const closeBtnRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const editing = Boolean(atraccion?.id);

  useEffect(() => {
    if (!isOpen) return;
    setForm(fromAtraccion(atraccion));
    setError(null);
    setSaving(false);
    const t = requestAnimationFrame(() => closeBtnRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [isOpen, atraccion]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!Number.isFinite(Number(form.precio_base)) || Number(form.precio_base) < 0) {
      setError('El precio base debe ser un número mayor o igual a 0.');
      return;
    }
    if (!Number.isFinite(Number(form.capacidad_diaria)) || Number(form.capacidad_diaria) < 1) {
      setError('La capacidad diaria debe ser un número mayor o igual a 1.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (editing) {
        await AtraccionesService.update(atraccion.id, payload);
      } else {
        await AtraccionesService.create(payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.userMessage || err?.message || 'No se pudo guardar la atracción.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="fixed inset-0 bg-ec-ink/70 backdrop-blur-sm cursor-default"
        aria-label="Cerrar formulario"
        onClick={() => !saving && onClose()}
        tabIndex={-1}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-ec-mist bg-white shadow-ec-card animate-fade-in"
      >
        <div className="flex items-center justify-between gap-4 border-b border-ec-mist bg-gradient-to-r from-ec-mist/50 to-white px-5 py-4 md:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ec-slate">Catálogo</p>
            <h2 id={titleId} className="text-2xl md:text-3xl leading-tight text-ec-ink">
              {editing ? 'Editar atracción' : 'Nueva atracción'}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-ec-mist bg-white p-2.5 min-h-11 min-w-11 flex items-center justify-center text-ec-slate hover:text-ec-ink hover:bg-ec-mist/50 disabled:opacity-50"
            aria-label="Cerrar formulario"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 md:p-8 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl text-sm" role="alert">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="adm-nombre" className="text-sm font-bold text-ec-ink">
                Nombre
              </label>
              <input
                id="adm-nombre"
                type="text"
                required
                maxLength={150}
                className="w-full border border-ec-mist rounded-xl px-3 py-3 bg-white"
                value={form.nombre}
                onChange={setField('nombre')}
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="adm-descripcion" className="text-sm font-bold text-ec-ink">
                Descripción
              </label>
              <textarea
                id="adm-descripcion"
                required
                rows={3}
                className="w-full border border-ec-mist rounded-xl px-3 py-3 bg-white"
                value={form.descripcion}
                onChange={setField('descripcion')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="adm-codigo" className="text-sm font-bold text-ec-ink">
                Código de aeropuerto
              </label>
              <input
                id="adm-codigo"
                type="text"
                required
                maxLength={10}
                placeholder="UIO"
                className="w-full border border-ec-mist rounded-xl px-3 py-3 bg-white uppercase"
                value={form.codigo_aeropuerto}
                onChange={setField('codigo_aeropuerto')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="adm-estado" className="text-sm font-bold text-ec-ink">
                Estado
              </label>
              <select
                id="adm-estado"
                className="w-full border border-ec-mist rounded-xl px-3 py-3 bg-white"
                value={form.estado}
                onChange={setField('estado')}
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="adm-precio" className="text-sm font-bold text-ec-ink">
                Precio base (USD)
              </label>
              <input
                id="adm-precio"
                type="number"
                required
                min={0}
                step="0.01"
                className="w-full border border-ec-mist rounded-xl px-3 py-3 bg-white"
                value={form.precio_base}
                onChange={setField('precio_base')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="adm-capacidad" className="text-sm font-bold text-ec-ink">
                Capacidad diaria
              </label>
              <input
                id="adm-capacidad"
                type="number"
                required
                min={1}
                step={1}
                className="w-full border border-ec-mist rounded-xl px-3 py-3 bg-white"
                value={form.capacidad_diaria}
                onChange={setField('capacidad_diaria')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="adm-duracion" className="text-sm font-bold text-ec-ink">
                Duración (horas)
              </label>
              <input
                id="adm-duracion"
                type="number"
                min={0}
                step="0.5"
                className="w-full border border-ec-mist rounded-xl px-3 py-3 bg-white"
                value={form.duracion_horas}
                onChange={setField('duracion_horas')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="adm-foto" className="text-sm font-bold text-ec-ink">
                URL de foto
              </label>
              <input
                id="adm-foto"
                type="url"
                placeholder="https://…"
                className="w-full border border-ec-mist rounded-xl px-3 py-3 bg-white"
                value={form.foto_url}
                onChange={setField('foto_url')}
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="adm-incluye" className="text-sm font-bold text-ec-ink">
                Qué incluye <span className="font-normal text-ec-slate">(un ítem por línea)</span>
              </label>
              <textarea
                id="adm-incluye"
                rows={3}
                placeholder={'Transporte\nGuía bilingüe\nAlmuerzo'}
                className="w-full border border-ec-mist rounded-xl px-3 py-3 bg-white"
                value={form.incluye}
                onChange={setField('incluye')}
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="adm-itinerario" className="text-sm font-bold text-ec-ink">
                Itinerario
              </label>
              <textarea
                id="adm-itinerario"
                rows={3}
                className="w-full border border-ec-mist rounded-xl px-3 py-3 bg-white"
                value={form.itinerario}
                onChange={setField('itinerario')}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-secondary px-6 py-3"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary px-6 py-3" disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear atracción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAttractionModal;
