import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AtraccionesService } from '../services/api';
import { formatApiError } from '../utils/apiErrors';
import { formatPrice, normalizeAtraccion } from '../utils/atraccion';
import AuthLoginPanel from './AuthLoginPanel';

const TODAY_ISO = new Date().toISOString().split('T')[0];

const PAYMENT_METHODS = [
  { value: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
  { value: 'PAYPAL', label: 'PayPal' },
];

const DEMO_TOKENS = [
  { value: 'tok_visa', label: 'tok_visa (éxito)' },
  { value: 'tok_mastercard', label: 'tok_mastercard (éxito)' },
  { value: 'tok_fail', label: 'tok_fail (rechazo)' },
];

const formatDateDisplay = (value) => {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const CheckoutModal = ({ atraccion, isOpen, onClose }) => {
  const a = normalizeAtraccion(atraccion);
  const { isAuthenticated } = useAuth();
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);

  /** Una clave por apertura de modal — reintentos de red reutilizan la misma transacción. */
  const idempotencyKeyRef = useRef(null);
  const payInFlightRef = useRef(false);

  const [step, setStep] = useState(1);
  const [ticketCount, setTicketCount] = useState(1);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [reservation, setReservation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [cardToken, setCardToken] = useState('tok_visa');

  useEffect(() => {
    if (!isOpen) return;
    idempotencyKeyRef.current = crypto.randomUUID();
    payInFlightRef.current = false;
    setStep(1);
    setError(null);
    setReservation(null);
    setTicketCount(1);
    setDate('');
    setTime('');
    setCustomerName('');
    setCustomerEmail('');
    setAvailability(null);
    setPaymentMethod('CREDIT_CARD');
    setCardToken('tok_visa');
    const t = requestAnimationFrame(() => closeBtnRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [isOpen, a?.id]);

  /** Consulta la disponibilidad real (GET /atracciones/:id/availability?date=). */
  useEffect(() => {
    if (!isOpen || !a?.id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setAvailability(null);
      setTime('');
      return;
    }
    let cancelled = false;
    setCheckingAvailability(true);
    AtraccionesService.checkAvailability(a.id, date)
      .then((data) => {
        if (cancelled) return;
        setAvailability(data);
        // Conserva el turno elegido si sigue con cupo; si no, el primero con cupo.
        const slots = data?.slots ?? [];
        setTime((prev) => {
          if (slots.some((s) => s.time === prev && s.available_spots > 0)) return prev;
          return (slots.find((s) => s.available_spots > 0) ?? slots[0])?.time ?? '';
        });
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, a?.id, date]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !a) return null;

  const ticketsInt = Math.max(1, parseInt(String(ticketCount), 10) || 1);
  const subtotal = a.precio_base * ticketsInt;
  // Cada turno tiene su propio cupo; sin `slots` (API anterior) se usa el total.
  const slots = availability?.slots ?? null;
  const selectedSlot = slots?.find((s) => s.time === time) ?? null;
  const availableSpots = slots
    ? (selectedSlot?.available_spots ?? null)
    : (availability?.available_spots ?? null);
  const scope = selectedSlot ? 'este turno' : 'esta fecha';
  const soldOut = availableSpots != null && availableSpots <= 0;
  const exceedsCapacity = availableSpots != null && ticketsInt > availableSpots;
  const canReserve = !isLoading && !checkingAvailability && !soldOut && !exceedsCapacity;

  const showError = (err) => {
    if (err?.name === 'ReservationValidationError') {
      setError(err.message);
      return;
    }
    setError(err.userMessage ?? formatApiError(err));
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('Debes iniciar sesión antes de reservar.');
      return;
    }
    if (soldOut) {
      setError(`No hay cupos disponibles para ${scope}.`);
      return;
    }
    if (exceedsCapacity) {
      setError(`Solo quedan ${availableSpots} cupos disponibles para ${scope}.`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await AtraccionesService.reserve(
        a.id,
        {
          date,
          time: selectedSlot?.time,
          ticketCount: ticketsInt,
          customerName,
          customerEmail,
        },
        idempotencyKeyRef.current,
      );
      setReservation(res);
      setStep(2);
    } catch (err) {
      showError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async () => {
    if (!reservation?.reservation_id || payInFlightRef.current) return;
    const token = cardToken.trim();
    if (!token) {
      setError('Ingresa el token de la tarjeta para continuar.');
      return;
    }
    payInFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      await AtraccionesService.pay(reservation.reservation_id, {
        card_token: token,
        method: paymentMethod,
      });
      setStep(3);
    } catch (err) {
      payInFlightRef.current = false;
      showError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalDisplay =
    reservation?.total_price?.total != null
      ? formatPrice(reservation.total_price.total)
      : formatPrice(subtotal);

  const payLabel = `${paymentMethod === 'PAYPAL' ? 'Pagar con PayPal' : 'Pagar con tarjeta'} · ${totalDisplay}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="fixed inset-0 bg-ec-ink/70 backdrop-blur-sm cursor-default"
        aria-label="Cerrar checkout"
        onClick={() => !isLoading && onClose()}
        tabIndex={-1}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-ec-mist bg-white shadow-ec-card animate-fade-in"
      >
        <div className="flex items-center justify-between gap-4 border-b border-ec-mist bg-gradient-to-r from-ec-mist/50 to-white px-5 py-4 md:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ec-slate">Checkout express</p>
            <h2 id={titleId} className="text-2xl md:text-3xl leading-tight text-ec-ink truncate pr-2">
              {a.nombre}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full border border-ec-mist bg-white p-2.5 min-h-11 min-w-11 flex items-center justify-center text-ec-slate hover:text-ec-ink hover:bg-ec-mist/50 disabled:opacity-50"
            aria-label="Cerrar ventana de reserva"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5 md:p-8">
          {!isAuthenticated && (
            <AuthLoginPanel compact onSuccess={() => setError(null)} />
          )}

          {isAuthenticated && (
            <>
              <ol className="flex justify-between items-center mb-8 relative list-none px-2" aria-label="Progreso del checkout">
                <li className="absolute left-0 top-1/2 w-full h-1 bg-ec-mist -z-10 -translate-y-1/2" aria-hidden="true" />
                <li
                  className={`absolute left-0 top-1/2 h-1 bg-ec-andes transition-all duration-500 -z-10 -translate-y-1/2 ${step === 1 ? 'w-0' : step === 2 ? 'w-1/2' : 'w-full'}`}
                  aria-hidden="true"
                />
                {[1, 2, 3].map((s) => (
                  <li
                    key={s}
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-ec-andes text-white shadow-md' : 'bg-ec-mist text-ec-slate'}`}
                    aria-current={step === s ? 'step' : undefined}
                  >
                    <span className="sr-only">Paso {s}: {s === 1 ? 'Reserva' : s === 2 ? 'Pago' : 'Confirmación'}</span>
                    <span aria-hidden="true">{s}</span>
                  </li>
                ))}
              </ol>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl" role="alert">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {step === 1 && (
                <form onSubmit={handleReserve} className="flex flex-col gap-5">
                  <div className="rounded-xl border border-ec-sand/60 bg-ec-sand/25 p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-ec-ink truncate">{a.nombre}</p>
                      <p className="text-ec-slate text-sm">Por favor, confirma los detalles de tu reserva.</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-extrabold text-ec-andes tabular-nums">{formatPrice(a.precio_base)}</p>
                      <p className="text-xs text-ec-slate">/ persona</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="res-date" className="text-sm font-bold text-ec-ink">
                        Fecha del tour
                      </label>
                      <input
                        id="res-date"
                        type="date"
                        required
                        min={TODAY_ISO}
                        className="w-full border border-ec-mist rounded-xl px-3 py-3 min-h-11 bg-white focus:border-ec-volcano focus:ring-2 focus:ring-ec-volcano/25"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="res-tickets" className="text-sm font-bold text-ec-ink">
                        Pasajeros
                      </label>
                      <input
                        id="res-tickets"
                        type="number"
                        min={1}
                        max={availableSpots ?? undefined}
                        step={1}
                        inputMode="numeric"
                        required
                        className="w-full border border-ec-mist rounded-xl px-3 py-3 min-h-11 bg-white focus:border-ec-volcano focus:ring-2 focus:ring-ec-volcano/25"
                        value={ticketCount}
                        onChange={(e) => {
                          const next = parseInt(e.target.value, 10);
                          setTicketCount(Number.isNaN(next) ? '' : next);
                        }}
                      />
                    </div>
                  </div>

                  {slots && slots.length > 0 && (
                    <fieldset className="flex flex-col gap-1.5">
                      <legend className="text-sm font-bold text-ec-ink mb-1.5">Turno</legend>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {slots.map((s) => {
                          const full = s.available_spots <= 0;
                          return (
                            <label
                              key={s.time}
                              className={`flex flex-col items-center justify-center min-h-11 rounded-xl border px-3 py-2 text-center transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ec-volcano/40 ${
                                full
                                  ? 'border-ec-mist bg-ec-mist/30 text-ec-slate cursor-not-allowed'
                                  : time === s.time
                                    ? 'border-ec-volcano bg-ec-volcano/10 text-ec-ink cursor-pointer'
                                    : 'border-ec-mist bg-white text-ec-ink hover:border-ec-volcano/60 cursor-pointer'
                              }`}
                            >
                              <input
                                type="radio"
                                name="res-time"
                                value={s.time}
                                checked={time === s.time}
                                disabled={full}
                                onChange={() => setTime(s.time)}
                                className="sr-only"
                              />
                              <span className="font-bold tabular-nums">{s.time}</span>
                              <span className="text-xs">
                                {full ? 'Agotado' : `${s.available_spots} ${s.available_spots === 1 ? 'cupo' : 'cupos'}`}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}

                  {date && (
                    <p
                      className={`text-sm font-semibold ${soldOut || exceedsCapacity ? 'text-red-700' : 'text-ec-andes'}`}
                      role="status"
                      aria-live="polite"
                    >
                      {checkingAvailability
                        ? 'Consultando disponibilidad…'
                        : availableSpots == null
                          ? 'Disponibilidad no disponible para esta fecha.'
                          : soldOut
                            ? `Sin cupos disponibles para ${scope}.`
                            : exceedsCapacity
                              ? `Solo quedan ${availableSpots} cupos para ${scope}.`
                              : `Cupos disponibles para ${scope}: ${availableSpots}.`}
                    </p>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="res-name" className="text-sm font-bold text-ec-ink">
                      Nombre del titular
                    </label>
                    <input
                      id="res-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Ej. María Pérez"
                      className="w-full border border-ec-mist rounded-xl px-3 py-3 min-h-11 bg-white focus:border-ec-volcano focus:ring-2 focus:ring-ec-volcano/25"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="res-email" className="text-sm font-bold text-ec-ink">
                      Email <span className="font-normal text-ec-slate">(opcional)</span>
                    </label>
                    <input
                      id="res-email"
                      type="email"
                      autoComplete="email"
                      className="w-full border border-ec-mist rounded-xl px-3 py-3 min-h-11 bg-white focus:border-ec-volcano focus:ring-2 focus:ring-ec-volcano/25"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>

                  <button type="submit" disabled={!canReserve} className="btn-primary w-full py-3.5 text-lg mt-1">
                    {isLoading ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        Asegurando cupos…
                      </>
                    ) : (
                      `Continuar — ${formatPrice(subtotal)}`
                    )}
                  </button>
                  <p className="text-[11px] text-ec-slate text-center mt-2">
                    Tus datos están protegidos con encriptación de extremo a extremo.
                  </p>
                </form>
              )}

              {step === 2 && reservation && (
                <div className="flex flex-col gap-5 animate-fade-in">
                  <div className="rounded-xl border border-ec-andes/30 bg-ec-andes/5 p-4">
                    <h3 className="font-extrabold text-ec-andes text-lg">Reserva pre-confirmada</h3>
                    <p className="text-sm text-ec-slate mt-1">
                      Finaliza el pago para asegurar tus cupos.
                    </p>
                    <p className="text-sm text-ec-slate mt-2">
                      Ref:{' '}
                      <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-ec-mist">
                        {String(reservation.reservation_id).split('-')[0]}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-ec-mist bg-ec-mist/20 p-5 space-y-3">
                    <dl className="space-y-2.5">
                      <div className="grid sm:grid-cols-2 gap-1 text-sm">
                        <dt className="text-ec-slate">Fecha del tour</dt>
                        <dd className="font-bold text-ec-ink">{formatDateDisplay(reservation.date)}</dd>
                      </div>
                      {reservation.time && (
                        <div className="grid sm:grid-cols-2 gap-1 text-sm">
                          <dt className="text-ec-slate">Turno</dt>
                          <dd className="font-bold text-ec-ink tabular-nums">{reservation.time}</dd>
                        </div>
                      )}
                      <div className="grid sm:grid-cols-2 gap-1 text-sm">
                        <dt className="text-ec-slate">Pasajeros</dt>
                        <dd className="font-bold text-ec-ink">
                          {reservation.ticket_count ?? ticketsInt} {reservation.ticket_count === 1 ? 'persona' : 'personas'}
                        </dd>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-ec-slate">
                          Subtotal ({reservation.ticket_count ?? ticketsInt} × {formatPrice(a.precio_base)})
                        </span>
                        <span className="font-bold tabular-nums">
                          {formatPrice(reservation.total_price?.total ?? subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-ec-slate">Impuestos y tasas</span>
                        <span className="font-bold text-ec-andes">Incluidos</span>
                      </div>
                      <div className="border-t border-ec-mist pt-3 flex justify-between items-center">
                        <span className="font-extrabold text-ec-ink">Total</span>
                        <span className="font-extrabold text-2xl tabular-nums text-ec-ink">{totalDisplay}</span>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="checkout-method" className="text-sm font-bold text-ec-ink">
                      Método de pago
                    </label>
                    <select
                      id="checkout-method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={isLoading}
                      className="w-full border border-ec-mist rounded-xl px-3 py-3 min-h-11 bg-white focus:border-ec-volcano focus:ring-2 focus:ring-ec-volcano/25"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {paymentMethod === 'CREDIT_CARD' && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="checkout-token" className="text-sm font-bold text-ec-ink">
                        Token de tarjeta
                      </label>
                      <input
                        id="checkout-token"
                        type="text"
                        value={cardToken}
                        onChange={(e) => setCardToken(e.target.value)}
                        disabled={isLoading}
                        placeholder="tok_visa"
                        autoComplete="off"
                        className="w-full border border-ec-mist rounded-xl px-3 py-3 min-h-11 bg-white focus:border-ec-volcano focus:ring-2 focus:ring-ec-volcano/25"
                      />
                      <div className="flex flex-wrap gap-2">
                        {DEMO_TOKENS.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setCardToken(t.value)}
                            disabled={isLoading}
                            className="text-xs font-semibold rounded-full border border-ec-mist px-3 py-1 text-ec-slate hover:border-ec-volcano hover:text-ec-volcano"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={isLoading}
                    className="btn-primary w-full py-3.5 text-lg"
                  >
                    {isLoading ? 'Procesando pago…' : payLabel}
                  </button>
                  <p className="text-center text-xs text-ec-slate mt-2">
                    Los cupos están reservados temporalmente hasta confirmar el pago.
                  </p>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col items-center gap-4 py-6 text-center animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-ec-andes/15 text-ec-andes flex items-center justify-center" aria-hidden="true">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-extrabold text-2xl md:text-3xl text-ec-ink">¡Pago confirmado!</h3>
                  <p className="text-ec-slate max-w-sm text-sm leading-relaxed">
                    Reserva pagada correctamente. Puedes ver el detalle y tus boletos en{' '}
                    <strong className="text-ec-ink">Mis reservas</strong>.
                  </p>
                  <div className="flex flex-col w-full gap-3 mt-4">
                    <Link
                      to="/mis-reservas"
                      onClick={onClose}
                      className="btn-primary w-full py-3.5 text-lg justify-center"
                    >
                      Ver mis reservas
                    </Link>
                    <button type="button" onClick={onClose} className="btn-secondary w-full py-3.5 text-lg">
                      Volver al catálogo
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
