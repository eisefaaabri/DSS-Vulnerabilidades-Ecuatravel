import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AtraccionesService } from '../services/api';
import { formatPrice, normalizeAtraccion, attractionThumbUrl } from '../utils/atraccion';
import AuthLoginPanel from './AuthLoginPanel';
import PayReservationModal from './PayReservationModal';

const STATUS_LABEL = {
  PENDING: 'Pendiente de pago',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
};

const CardStatusBadge = ({ status }) => {
  const tone =
    status === 'CONFIRMED'
      ? 'bg-ec-andes/15 text-ec-andes'
      : status === 'CANCELLED'
        ? 'bg-ec-mist text-ec-slate'
        : 'bg-amber-100 text-amber-800';
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${tone}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
};

const MyReservations = () => {
  const { isAuthenticated } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [atracciones, setAtracciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [paying, setPaying] = useState(null);
  const [cancelOpenId, setCancelOpenId] = useState(null);
  const [reason, setReason] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resData, catData] = await Promise.all([
        AtraccionesService.getMyReservations(),
        AtraccionesService.getAll({ page: 1, limit: 100 }),
      ]);
      setReservations(Array.isArray(resData?.data) ? resData.data : []);
      setAtracciones(Array.isArray(catData?.data) ? catData.data : []);
    } catch (err) {
      setError(err?.userMessage || 'No pudimos cargar tus reservas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setReservations([]);
      setLoading(false);
      return;
    }
    load();
  }, [isAuthenticated, load]);

  const atrMap = useMemo(
    () => new Map(atracciones.map((a) => [a.id, normalizeAtraccion(a)])),
    [atracciones],
  );

  if (!isAuthenticated) {
    return (
      <div className="section-grid py-16 md:py-20 max-w-lg">
        <h1 className="text-4xl md:text-5xl leading-tight text-ec-ink">Mis reservas</h1>
        <div className="mt-6 rounded-2xl border border-ec-mist bg-white p-6 shadow-ec-card">
          <p className="text-sm text-ec-slate mb-4">
            Inicia sesión para ver tus reservas y su estado de pago.
          </p>
          <AuthLoginPanel compact />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-ec-mist/40 to-transparent pt-8 md:pt-12 pb-16">
      <div className="section-grid">
        <h1 className="text-4xl md:text-5xl leading-tight text-ec-ink">Mis reservas</h1>
        <p className="mt-2 text-ec-slate">
          Consulta el estado de tus tours y gestiona el pago o la cancelación.
        </p>

        {notice && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
            <span>{error}</span>
            <button type="button" onClick={load} className="btn-secondary px-4 py-1.5 text-xs">
              Reintentar
            </button>
          </div>
        )}

        {cancelError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
            {cancelError}
          </div>
        )}

        {loading && (
          <div className="mt-8 space-y-4" role="status" aria-live="polite">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 bg-ec-mist rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !error && reservations.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-ec-mist bg-white/60 p-10 text-center">
            <p className="text-ec-slate">Aún no tienes reservas.</p>
            <Link to="/experiencias" className="btn-primary px-8 py-3 mt-6 inline-flex">
              Explorar experiencias
            </Link>
          </div>
        )}

        {!loading && !error && reservations.length > 0 && (
          <ul className="mt-8 space-y-4">
            {reservations.map((r) => {
              const atr = atrMap.get(r.atraccion_id) ?? {
                id: r.atraccion_id,
                nombre: 'Experiencia eliminada',
                codigo_aeropuerto: '—',
              };
              return (
                <li
                  key={r.reservation_id}
                  className="rounded-2xl border border-ec-mist/90 bg-white p-4 md:p-5 flex flex-col gap-4 shadow-sm"
                >
                  <div className="flex flex-wrap gap-4">
                    <Link
                      to={`/experiencias/${atr.id}`}
                      className="shrink-0 w-full sm:w-32 h-40 sm:h-24 overflow-hidden rounded-xl border border-ec-mist bg-ec-mist"
                      aria-label={`Ver detalle de ${atr.nombre}`}
                    >
                      <img
                        src={attractionThumbUrl(atr)}
                        alt={atr.nombre}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="font-sans font-extrabold text-ec-ink truncate">
                            <Link to={`/experiencias/${atr.id}`} className="hover:text-ec-pacific">
                              {atr.nombre}
                            </Link>
                          </h2>
                          <p className="text-sm text-ec-slate mt-1">
                            {r.date} · {r.ticket_count} {r.ticket_count === 1 ? 'pasajero' : 'pasajeros'} · Salida {atr.codigo_aeropuerto}
                          </p>
                          <p className="text-xs text-ec-slate mt-1">
                            Ref:{' '}
                            <span className="font-mono">{String(r.reservation_id).split('-')[0]}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-extrabold text-ec-ink tabular-nums">
                            {formatPrice(r.total_price?.total ?? 0)}
                          </p>
                          <CardStatusBadge status={r.status} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ec-mist pt-3">
                    {r.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaying(r);
                          setCancelError(null);
                        }}
                        className="btn-primary px-5 py-2.5 text-sm"
                      >
                        Pagar ahora
                      </button>
                    )}
                    {r.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelOpenId((id) => (id === r.reservation_id ? null : r.reservation_id));
                          setReason('');
                          setCancelError(null);
                        }}
                        disabled={cancellingId === r.reservation_id}
                        className="btn-secondary px-5 py-2.5 text-sm"
                        aria-expanded={cancelOpenId === r.reservation_id}
                      >
                        {cancellingId === r.reservation_id ? 'Cancelando…' : 'Cancelar reserva'}
                      </button>
                    )}

                    {cancelOpenId === r.reservation_id && (
                      <form
                        className="basis-full flex flex-col sm:flex-row gap-2 pt-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCancel(r);
                        }}
                      >
                        <input
                          type="text"
                          required
                          minLength={3}
                          maxLength={200}
                          placeholder={`Motivo de la cancelación…`}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          aria-label="Motivo de la cancelación"
                          className="flex-1 border border-ec-mist rounded-xl px-3 py-2 min-h-11 text-sm focus:border-ec-volcano focus:ring-2 focus:ring-ec-volcano/25"
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="btn-primary px-5 py-2.5 text-sm bg-red-600">
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelOpenId(null)}
                            className="text-sm font-bold text-ec-slate px-3 py-2 min-h-11"
                          >
                            Volver
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {paying && (
        <PayReservationModal
          reservation={paying}
          atraccion={atrMap.get(paying.atraccion_id) ?? null}
          isOpen
          onClose={() => setPaying(null)}
          onSuccess={() => {
            setPaying(null);
            setNotice('Pago procesado correctamente. Tu reserva fue confirmada.');
            load();
          }}
        />
      )}
    </div>
  );

  function handleCancel(r) {
    if (cancellingId) return;
    setCancellingId(r.reservation_id);
    setCancelError(null);
    const idempotencyKey = crypto.randomUUID();
    AtraccionesService.cancelReservation(r.reservation_id, reason.trim(), idempotencyKey)
      .then(() => {
        setNotice('Reserva cancelada correctamente.');
        setCancelOpenId(null);
        setReason('');
        load();
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 409 || status === 404) {
          setCancelOpenId(null);
          setReason('');
          load();
          setNotice('La reserva ya fue procesada; su estado actual está actualizado.');
        } else {
          setCancelError(err?.userMessage || 'No se pudo cancelar la reserva.');
        }
      })
      .finally(() => setCancellingId(null));
  }
};

export default MyReservations;