import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ClientesService, PersonalService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/atraccion';
import AdminPageHeader from './AdminPageHeader';
import AdminClienteModal from './AdminClienteModal';

const PAGE_SIZE = 20;

const ESTADO_RESERVA = {
  PENDIENTE_PAGO: { label: 'Pendiente de pago', className: 'bg-ec-mist text-ec-slate' },
  CONFIRMADA: { label: 'Confirmada', className: 'bg-amber-100 text-amber-900' },
  CHECKED_IN: { label: 'Asistió', className: 'bg-green-100 text-green-800' },
  COMPLETADA: { label: 'Completada', className: 'bg-green-100 text-green-800' },
  CANCELADA: { label: 'Cancelada', className: 'bg-red-100 text-red-800' },
};

const formatFecha = (iso) =>
  iso ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(iso)) : '—';

const ClienteDetalle = ({ id, onClose, onChanged }) => {
  const titleId = useId();
  const closeRef = useRef(null);
  const { isAdmin } = useAuth();
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState(null);
  const [rol, setRol] = useState('OPERADOR');
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ClientesService.get(id)
      .then((data) => !cancelled && setCliente(data))
      .catch((err) => !cancelled && setError(err?.userMessage || 'No se pudo cargar el cliente.'));
    closeRef.current?.focus();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !granting && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [granting, onClose]);

  const darAcceso = async () => {
    if (!window.confirm(`¿Dar acceso de ${rol} a ${cliente.email}? Dejará de aparecer en Clientes.`)) return;
    setGranting(true);
    setError(null);
    try {
      await PersonalService.setRole(id, rol);
      onChanged();
      onClose();
    } catch (err) {
      setError(err?.userMessage || 'No se pudo dar el acceso.');
      setGranting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="fixed inset-0 bg-ec-ink/60 cursor-default"
        aria-label="Cerrar ficha"
        onClick={() => !granting && onClose()}
        tabIndex={-1}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white shadow-ec-card animate-fade-in"
      >
        <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-ec-mist bg-white px-5 py-4">
          <h2 id={titleId} className="text-2xl leading-tight text-ec-ink truncate">
            {cliente?.nombre || 'Cliente'}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ec-slate hover:bg-ec-mist/70 hover:text-ec-ink"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-6">
          {error && (
            <p className="p-3 bg-red-50 border-l-4 border-red-500 text-red-800 text-sm rounded-r-xl" role="alert">
              {error}
            </p>
          )}
          {!cliente && !error && (
            <div className="animate-pulse space-y-3" role="status" aria-live="polite">
              <div className="h-20 bg-ec-mist rounded-xl" />
              <div className="h-32 bg-ec-mist rounded-xl" />
            </div>
          )}
          {cliente && (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ['Email', cliente.email],
                  ['Identificación', cliente.identificacion || '—'],
                  ['Teléfono', cliente.telefono || '—'],
                  ['Registro', formatFecha(cliente.creado_en)],
                  ['Último acceso', formatFecha(cliente.ultimo_acceso)],
                  ['Estado', cliente.activo ? 'Activo' : 'Desactivado'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-ec-slate">{k}</dt>
                    <dd className="font-semibold text-ec-ink break-words">{v}</dd>
                  </div>
                ))}
              </dl>

              <section aria-labelledby={`${titleId}-fact`}>
                <h3 id={`${titleId}-fact`} className="text-lg font-bold text-ec-ink mb-2">
                  Datos de facturación
                </h3>
                {cliente.perfiles_facturacion.length === 0 ? (
                  <p className="text-sm text-ec-slate">Sin perfil de facturación; se factura como consumidor final.</p>
                ) : (
                  <ul className="space-y-2">
                    {cliente.perfiles_facturacion.map((p) => (
                      <li key={`${p.tipo_identificacion}-${p.identificacion}`} className="rounded-xl border border-ec-mist p-3 text-sm">
                        <p className="font-semibold text-ec-ink">
                          {p.razon_social}
                          {p.principal && (
                            <span className="ml-2 rounded-full bg-ec-mist px-2 py-0.5 text-[11px] font-bold text-ec-slate">
                              Principal
                            </span>
                          )}
                        </p>
                        <p className="text-ec-slate">
                          {p.tipo_identificacion} {p.identificacion} · {p.correo}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby={`${titleId}-res`}>
                <h3 id={`${titleId}-res`} className="text-lg font-bold text-ec-ink mb-2">
                  Reservas ({cliente.reservas.length})
                </h3>
                {cliente.reservas.length === 0 ? (
                  <p className="text-sm text-ec-slate">Todavía no tiene reservas.</p>
                ) : (
                  <ul className="space-y-2">
                    {cliente.reservas.map((r) => {
                      const estado = ESTADO_RESERVA[r.estado] ?? { label: r.estado, className: 'bg-ec-mist text-ec-slate' };
                      return (
                        <li key={r.reservation_id} className="rounded-xl border border-ec-mist p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-ec-ink">{r.atraccion}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${estado.className}`}>
                              {estado.label}
                            </span>
                          </div>
                          <p className="text-ec-slate tabular-nums">
                            <span className="font-mono">{r.reservation_code}</span> · {r.fecha} {r.hora} · {r.tickets}{' '}
                            {r.tickets === 1 ? 'persona' : 'personas'} · {formatPrice(r.total)} ·{' '}
                            {r.canal === 'BOOKING' ? 'Booking' : 'Web'}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {isAdmin && (
                <section className="rounded-xl border border-ec-mist bg-ec-mist/20 p-4">
                  <h3 className="font-bold text-ec-ink">Dar acceso de personal</h3>
                  <p className="text-sm text-ec-slate mt-1">
                    Para un guía o administrador que ya tenía cuenta de cliente. Pasará a la sección Personal.
                  </p>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <label htmlFor={`${titleId}-rol`} className="sr-only">
                      Rol
                    </label>
                    <select
                      id={`${titleId}-rol`}
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      className="border border-ec-mist rounded-xl px-3 py-2.5 min-h-11 bg-white text-sm font-semibold"
                    >
                      <option value="OPERADOR">OPERADOR (guía: reservas y check-in)</option>
                      <option value="ADMIN">ADMIN (acceso total)</option>
                    </select>
                    <button type="button" onClick={darAcceso} disabled={granting} className="btn-secondary px-4 py-2.5 text-sm">
                      {granting ? 'Aplicando…' : 'Dar acceso'}
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
};

const AdminClientes = () => {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ totalItems: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await ClientesService.list({ q: query, page, limit: PAGE_SIZE });
      setItems(payload?.data ?? []);
      setMeta(payload?.meta ?? { totalItems: 0, page: 1, totalPages: 1 });
    } catch (err) {
      setError(err?.userMessage || 'No se pudieron cargar los clientes.');
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = (e) => {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  };

  return (
    <section>
      <AdminPageHeader
        title="Clientes"
        description="Turistas registrados en la web o enviados por Booking, con sus datos de facturación y reservas."
        actions={
          <form onSubmit={submit} role="search" className="flex gap-2">
            <label htmlFor="clientes-buscar" className="sr-only">
              Buscar clientes
            </label>
            <input
              id="clientes-buscar"
              type="search"
              placeholder="Nombre, email o cédula"
              className="w-full sm:w-72 border border-ec-mist rounded-xl px-3 py-2.5 min-h-11 bg-white"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!e.target.value) {
                  setPage(1);
                  setQuery('');
                }
              }}
            />
            <button type="submit" className="btn-secondary px-5 py-2.5 shrink-0">
              Buscar
            </button>
            <button type="button" onClick={() => setCreating(true)} className="btn-primary px-5 py-2.5 shrink-0">
              Nuevo cliente
            </button>
          </form>
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3" role="status" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-ec-mist rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-ec-slate py-10 text-center">
          {query ? 'Ningún cliente coincide con la búsqueda.' : 'Todavía no hay clientes registrados.'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-ec-mist bg-white">
            <table className="w-full text-sm text-left">
              <thead className="bg-ec-mist/50 text-ec-slate uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-3 font-bold">Cliente</th>
                  <th className="px-4 py-3 font-bold">Identificación</th>
                  <th className="px-4 py-3 font-bold">Facturación</th>
                  <th className="px-4 py-3 font-bold">Reservas</th>
                  <th className="px-4 py-3 font-bold">Registro</th>
                  <th className="px-4 py-3 font-bold text-right">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.client_id} className="border-t border-ec-mist/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ec-ink">{c.nombre}</p>
                      <p className="text-xs text-ec-slate">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{c.identificacion || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {c.facturacion ? (
                        <>
                          <span className="font-semibold text-ec-ink">{c.facturacion.tipo_identificacion}</span>{' '}
                          {c.facturacion.identificacion}
                        </>
                      ) : (
                        <span className="text-ec-slate">Consumidor final</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {c.reservas.total}
                      {c.reservas.activas > 0 && (
                        <span className="ml-1 text-xs text-ec-slate">({c.reservas.activas} activas)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ec-slate">{formatFecha(c.creado_en)}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setSelected(c.client_id)} className="btn-secondary px-3 py-2 text-xs">
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-ec-slate">
            <span>
              {meta.totalItems} {meta.totalItems === 1 ? 'cliente' : 'clientes'}
            </span>
            {meta.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button type="button" className="btn-secondary px-3 py-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </button>
                <span className="tabular-nums">
                  {page} / {meta.totalPages}
                </span>
                <button
                  type="button"
                  className="btn-secondary px-3 py-2"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {selected && <ClienteDetalle id={selected} onClose={() => setSelected(null)} onChanged={load} />}
      <AdminClienteModal
        isOpen={creating}
        onClose={() => setCreating(false)}
        onSaved={(nuevo) => {
          load();
          if (nuevo?.client_id) setSelected(nuevo.client_id);
        }}
      />
    </section>
  );
};

export default AdminClientes;
