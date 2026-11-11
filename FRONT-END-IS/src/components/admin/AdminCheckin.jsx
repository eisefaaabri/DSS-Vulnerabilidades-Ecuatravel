import React, { useCallback, useEffect, useState } from 'react';
import { AdminService } from '../../services/api';
import AdminPageHeader from './AdminPageHeader';

const hoyEcuador = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());

// Estados de asistencia que devuelve el backend (contrato de Booking v3.1).
const ESTADOS = {
  PENDIENTE_ASISTENCIA: { hint: 'Reservada, el turista aún no llega', className: 'bg-amber-100 text-amber-900' },
  CONFIRMADO_ASISTIDO: { hint: 'El turista llegó al punto de encuentro', className: 'bg-green-100 text-green-800' },
  CANCELADA: { hint: 'Reserva cancelada', className: 'bg-red-100 text-red-800' },
  PENDIENTE_PAGO: { hint: 'Reserva web sin pagar', className: 'bg-ec-mist text-ec-slate' },
};

const AVISO_BOOKING = {
  NOTIFICADO: 'Booking recibió la confirmación de asistencia.',
  REINTENTANDO: 'Booking no respondió; el aviso se reintentará automáticamente.',
  RECHAZADO: 'Booking rechazó el aviso. Revisa los registros del servidor.',
  NO_CONFIGURADO: 'El aviso a Booking no está configurado en el servidor.',
};

const formatHora = (iso) =>
  new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const CheckinForm = ({ reserva, onDone, onCancel }) => {
  const [documento, setDocumento] = useState('');
  const [asistentes, setAsistentes] = useState(reserva.tickets);
  const [codigo, setCodigo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await AdminService.checkin(reserva.reservation_id, {
        ...(documento.trim() && { documento_identidad: documento.trim() }),
        asistentes_reales: Number(asistentes) || reserva.tickets,
        ...(codigo.trim() && { codigo_voucher_qr: codigo.trim() }),
        ...(observaciones.trim() && { observaciones: observaciones.trim() }),
      });
      onDone(res);
    } catch (err) {
      setError(err?.userMessage || err?.message || 'No se pudo registrar la asistencia.');
    } finally {
      setSending(false);
    }
  };

  const id = reserva.reservation_id;
  const field =
    'w-full border border-ec-mist rounded-xl px-3 py-2.5 min-h-11 bg-white focus:border-ec-volcano focus:ring-2 focus:ring-ec-volcano/25';

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2 border-t border-ec-mist pt-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`doc-${id}`} className="text-sm font-bold text-ec-ink">
          Documento que presenta <span className="font-normal text-ec-slate">(opcional)</span>
        </label>
        <input
          id={`doc-${id}`}
          autoComplete="off"
          inputMode="text"
          pattern="[A-Za-z0-9]{5,20}"
          title="Cédula, RUC o pasaporte (5 a 20 letras o números)"
          className={field}
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`asis-${id}`} className="text-sm font-bold text-ec-ink">
          Personas que llegaron
        </label>
        <input
          id={`asis-${id}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={reserva.tickets}
          required
          className={field}
          value={asistentes}
          onChange={(e) => setAsistentes(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor={`qr-${id}`} className="text-sm font-bold text-ec-ink">
          Código del voucher o QR <span className="font-normal text-ec-slate">(opcional)</span>
        </label>
        <input
          id={`qr-${id}`}
          autoComplete="off"
          placeholder="ECT-XXXXXX"
          className={field}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor={`obs-${id}`} className="text-sm font-bold text-ec-ink">
          Observaciones <span className="font-normal text-ec-slate">(opcional)</span>
        </label>
        <input
          id={`obs-${id}`}
          maxLength={500}
          className={field}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>
      {error && (
        <p className="sm:col-span-2 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="sm:col-span-2 flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary px-4 py-2.5" disabled={sending}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary px-5 py-2.5" disabled={sending}>
          {sending ? 'Confirmando…' : 'Confirmar check-in'}
        </button>
      </div>
    </form>
  );
};

const AdminCheckin = () => {
  const [fecha, setFecha] = useState(hoyEcuador);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await AdminService.getReservations(query ? { q: query } : { fecha });
      setItems(Array.isArray(payload?.data) ? payload.data : []);
    } catch (err) {
      setError(err?.userMessage || err?.message || 'No se pudieron cargar las reservas.');
    } finally {
      setLoading(false);
    }
  }, [fecha, query]);

  useEffect(() => {
    load();
  }, [load]);

  const submitSearch = (e) => {
    e.preventDefault();
    setResult(null);
    setQuery(search.trim());
  };

  const clearSearch = () => {
    setSearch('');
    setQuery('');
  };

  const handleDone = (reserva, res) => {
    setOpenId(null);
    setResult({ code: reserva.reservation_code, res });
    // El estado cambia en pantalla sin esperar a recargar la lista.
    setItems((prev) =>
      prev.map((r) =>
        r.reservation_id === reserva.reservation_id
          ? { ...r, estado_asistencia: 'CONFIRMADO_ASISTIDO', checkin_en: res.hora_checkin }
          : r,
      ),
    );
  };

  return (
    <section>
      <AdminPageHeader
        title="Reservas / Check-in"
        description="Busca la reserva cuando el turista llega al punto de encuentro y confirma su asistencia. Las reservas de Booking se le notifican."
      />
      <div className="flex flex-col md:flex-row md:items-end gap-3 mb-5">
        <form onSubmit={submitSearch} className="flex flex-col gap-1.5 flex-1" role="search">
          <label htmlFor="checkin-buscar" className="text-sm font-bold text-ec-ink">
            Buscar reserva
          </label>
          <div className="flex gap-2">
            <input
              id="checkin-buscar"
              type="search"
              placeholder="Código ECT-XXXXXX, cédula o email"
              autoComplete="off"
              className="w-full border border-ec-mist rounded-xl px-3 py-2.5 min-h-11 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-primary px-5 py-2.5 shrink-0" disabled={!search.trim()}>
              Buscar
            </button>
          </div>
        </form>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="checkin-fecha" className="text-sm font-bold text-ec-ink">
            O ver un día
          </label>
          <input
            id="checkin-fecha"
            type="date"
            className="border border-ec-mist rounded-xl px-3 py-2.5 min-h-11 bg-white"
            value={fecha}
            onChange={(e) => {
              if (!e.target.value) return;
              setFecha(e.target.value);
              clearSearch();
            }}
          />
        </div>
      </div>

      {query && (
        <p className="mb-4 text-sm text-ec-slate">
          Resultados para <strong className="text-ec-ink">{query}</strong> en todas las fechas.{' '}
          <button type="button" onClick={clearSearch} className="font-bold text-ec-volcano underline underline-offset-2">
            Volver al día
          </button>
        </p>
      )}

      {result && (
        <div className="mb-5 rounded-xl border border-ec-andes/30 bg-ec-andes/5 p-4" role="status" aria-live="polite">
          <p className="font-extrabold text-ec-andes">
            Asistencia confirmada · {result.code}
          </p>
          <p className="text-sm text-ec-slate mt-1">
            Pase emitido a las {formatHora(result.res.hora_checkin)} para {result.res.titular_nombre}.
          </p>
          {result.res.booking_notificacion && (
            <p
              className={`text-sm mt-1 font-semibold ${
                result.res.booking_notificacion.estado === 'NOTIFICADO' ? 'text-ec-andes' : 'text-amber-800'
              }`}
            >
              {AVISO_BOOKING[result.res.booking_notificacion.estado] ?? 'Estado del aviso a Booking desconocido.'}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-5 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3" role="status" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-ec-mist rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-ec-slate py-10 text-center">
          {query ? 'Ninguna reserva coincide con la búsqueda.' : 'No hay reservas para esta fecha.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => {
            const estado = ESTADOS[r.estado_asistencia] ?? { hint: '', className: 'bg-ec-mist text-ec-slate' };
            const open = openId === r.reservation_id;
            return (
              <li key={r.reservation_id} className="rounded-2xl border border-ec-mist bg-white p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3 md:w-40 shrink-0">
                    <span className="flex flex-col leading-tight">
                      <span className="text-xl font-extrabold tabular-nums text-ec-ink">{r.hora}</span>
                      {query && <span className="text-xs text-ec-slate tabular-nums">{r.fecha}</span>}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        r.canal === 'BOOKING' ? 'bg-ec-volcano/10 text-ec-volcano' : 'bg-ec-mist text-ec-slate'
                      }`}
                    >
                      {r.canal === 'BOOKING' ? 'Booking' : 'Web'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ec-ink truncate">{r.atraccion}</p>
                    <p className="text-sm text-ec-slate">
                      <span className="font-mono">{r.reservation_code}</span> · {r.titular_nombre} ·{' '}
                      {r.tickets} {r.tickets === 1 ? 'persona' : 'personas'}
                    </p>
                    {r.checkin_en && (
                      <p className="text-xs text-ec-slate mt-0.5">
                        Check-in {formatHora(r.checkin_en)}
                        {r.checkin_por ? ` por ${r.checkin_por}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 md:justify-end">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide ${estado.className}`}
                      title={estado.hint}
                    >
                      {r.estado_asistencia}
                    </span>
                    {r.estado_asistencia === 'PENDIENTE_ASISTENCIA' && !open && (
                      <button
                        type="button"
                        onClick={() => {
                          setResult(null);
                          setOpenId(r.reservation_id);
                        }}
                        className="btn-primary px-4 py-2.5 text-sm"
                        aria-expanded={open}
                      >
                        Confirmar asistencia / Check-in
                      </button>
                    )}
                  </div>
                </div>
                {open && (
                  <CheckinForm
                    reserva={r}
                    onDone={(res) => handleDone(r, res)}
                    onCancel={() => setOpenId(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default AdminCheckin;
