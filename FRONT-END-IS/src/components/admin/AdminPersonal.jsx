import React, { useCallback, useEffect, useState } from 'react';
import { PersonalService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AdminPageHeader from './AdminPageHeader';
import AdminPersonalModal from './AdminPersonalModal';

const ROLES = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador (guía)',
};
const SIN_ACCESO = 'SIN_ACCESO';
const selectClass =
  'border border-ec-mist rounded-xl px-3 py-2 min-h-11 bg-white text-sm font-semibold disabled:opacity-50';

const formatFecha = (iso) =>
  iso ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(iso)) : 'Nunca';

const AdminPersonal = () => {
  const { session } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await PersonalService.list();
      setItems(payload?.data ?? []);
    } catch (err) {
      setError(err?.userMessage || 'No se pudo cargar el personal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (persona, action, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(persona.id);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err?.userMessage || 'No se pudo aplicar el cambio.');
    } finally {
      setBusyId(null);
    }
  };

  const cambiarRol = (p, rol) => {
    if (rol === p.rol) return;
    if (rol === SIN_ACCESO) {
      run(p, () => PersonalService.removeAccess(p.id), `¿Quitar el acceso al panel a ${p.email}? La cuenta quedará como cliente.`);
      return;
    }
    run(p, () => PersonalService.setRole(p.id, rol), `¿Cambiar a ${p.email} a ${ROLES[rol]}?`);
  };

  const cambiarEstado = (p, activo) =>
    run(
      p,
      () => PersonalService.setActive(p.id, activo),
      activo ? null : `¿Desactivar a ${p.email}? No podrá iniciar sesión hasta que lo actives.`,
    );

  return (
    <section>
      <AdminPageHeader
        title="Personal"
        description="Administradores y guías (operadores) que usan este panel. Los clientes se gestionan en su propia sección."
        actions={
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary px-5 py-2.5">
            Nueva cuenta de personal
          </button>
        }
      />

      <dl className="mb-6 grid gap-3 sm:grid-cols-2 text-sm">
        <div className="rounded-xl border border-ec-mist bg-white p-4">
          <dt className="font-bold text-ec-ink">{ROLES.ADMIN}</dt>
          <dd className="text-ec-slate mt-1">
            Acceso total: catálogo y cupos, reservas y check-in, clientes y personal.
          </dd>
        </div>
        <div className="rounded-xl border border-ec-mist bg-white p-4">
          <dt className="font-bold text-ec-ink">{ROLES.OPERADOR}</dt>
          <dd className="text-ec-slate mt-1">
            Trabaja en el punto de encuentro: busca reservas, confirma la asistencia y consulta o registra clientes.
            No edita el catálogo ni el personal.
          </dd>
        </div>
      </dl>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3" role="status" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 bg-ec-mist rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-ec-slate py-10 text-center">No hay cuentas de personal.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ec-mist bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-ec-mist/50 text-ec-slate uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 font-bold">Persona</th>
                <th className="px-4 py-3 font-bold">Rol</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Último acceso</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const self = p.id === session?.userId;
                const busy = busyId === p.id;
                return (
                  <tr key={p.id} className="border-t border-ec-mist/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ec-ink">
                        {p.nombre}
                        {self && <span className="ml-2 text-xs font-normal text-ec-slate">(tú)</span>}
                      </p>
                      <p className="text-xs text-ec-slate">{p.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {self ? (
                        <span className="text-xs font-bold text-ec-ink" title="Tu cuenta no se modifica desde aquí">
                          {ROLES[p.rol] ?? p.rol}
                        </span>
                      ) : (
                        <>
                          <label htmlFor={`rol-${p.id}`} className="sr-only">
                            Rol de {p.nombre}
                          </label>
                          <select
                            id={`rol-${p.id}`}
                            value={p.rol}
                            disabled={busy}
                            onChange={(e) => cambiarRol(p, e.target.value)}
                            className={selectClass}
                          >
                            <option value="ADMIN">{ROLES.ADMIN}</option>
                            <option value="OPERADOR">{ROLES.OPERADOR}</option>
                            <option value={SIN_ACCESO}>Quitar acceso (pasa a cliente)</option>
                          </select>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {self ? (
                        <span className="text-xs font-bold text-green-700">Activo</span>
                      ) : (
                        <>
                          <label htmlFor={`estado-${p.id}`} className="sr-only">
                            Estado de {p.nombre}
                          </label>
                          <select
                            id={`estado-${p.id}`}
                            value={p.activo ? 'activo' : 'inactivo'}
                            disabled={busy}
                            onChange={(e) => cambiarEstado(p, e.target.value === 'activo')}
                            className={`${selectClass} ${p.activo ? 'text-green-800' : 'text-red-700'}`}
                          >
                            <option value="activo">Activo</option>
                            <option value="inactivo">Desactivado</option>
                          </select>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ec-slate">{formatFecha(p.ultimo_acceso)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminPersonalModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />
    </section>
  );
};

export default AdminPersonal;
