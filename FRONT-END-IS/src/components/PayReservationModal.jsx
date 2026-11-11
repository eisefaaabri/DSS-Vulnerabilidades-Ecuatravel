import React, { useEffect, useId, useRef, useState } from 'react';
import { AtraccionesService } from '../services/api';
import { formatPrice } from '../utils/atraccion';

const METHODS = [
  { value: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
  { value: 'PAYPAL', label: 'PayPal' },
];

const DEMO_TOKENS = [
  { value: 'tok_visa', label: 'tok_visa (éxito)' },
  { value: 'tok_mastercard', label: 'tok_mastercard (éxito)' },
  { value: 'tok_fail', label: 'tok_fail (rechazo)' },
];

/**
 * Modal para pagar una reserva PENDING existente desde "Mis reservas".
 * Reutiliza la misma ruta POST /atracciones/reservations/:id/pay del checkout.
 */
const PayReservationModal = ({ reservation, atraccion, isOpen, onClose, onSuccess }) => {
  const titleId = useId();
  const closeBtnRef = useRef(null);
  const payInFlightRef = useRef(false);

  const [method, setMethod] = useState('CREDIT_CARD');
  const [cardToken, setCardToken] = useState('tok_visa');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    payInFlightRef.current = false;
    setError(null);
    setMethod('CREDIT_CARD');
    setCardToken('tok_visa');
    const t = requestAnimationFrame(() => closeBtnRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [isOpen, reservation?.reservation_id]);

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

  if (!isOpen || !reservation) return null;

  const total = reservation.total_price?.total ?? 0;

  const handlePay = async () => {
    if (payInFlightRef.current) return;
    const token = cardToken.trim();
    if (!token) {
      setError('Ingresa el token de la tarjeta.');
      return;
    }
    payInFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      await AtraccionesService.pay(reservation.reservation_id, { card_token: token, method });
      onSuccess();
    } catch (err) {
      payInFlightRef.current = false;
      setError(err?.userMessage || 'No se pudo procesar el pago.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-ec-ink/70 cursor-default"
        aria-label="Cerrar pago"
        onClick={() => !isLoading && onClose()}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-ec-mist bg-white shadow-ec-card"
      >
        <div className="flex items-center justify-between gap-4 border-b border-ec-mist px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-ec-slate">Pagar reserva</p>
            <h2 id={titleId} className="text-2xl md:text-3xl leading-tight text-ec-ink truncate">
              {atraccion?.nombre ?? 'Reserva'}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full border border-ec-mist p-2.5 min-h-11 min-w-11 flex items-center justify-center text-ec-slate hover:bg-ec-mist/50 disabled:opacity-50"
            aria-label="Cerrar ventana de pago"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center rounded-xl border border-ec-mist bg-ec-mist/20 p-4">
            <div>
              <p className="text-sm text-ec-slate">
                {reservation.date} · {reservation.ticket_count} {reservation.ticket_count === 1 ? 'pasajero' : 'pasajeros'}
              </p>
              <p className="text-xs text-ec-slate mt-0.5">
                Ref: <span className="font-mono">{String(reservation.reservation_id).split('-')[0]}</span>
              </p>
            </div>
            <p className="text-2xl font-extrabold text-ec-ink tabular-nums">{formatPrice(total)}</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl text-sm" role="alert">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pay-method" className="text-sm font-bold text-ec-ink">
              Método de pago
            </label>
            <select
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={isLoading}
              className="w-full border border-ec-mist rounded-xl px-3 py-3 min-h-11 bg-white focus:border-ec-volcano focus:ring-2 focus:ring-ec-volcano/25"
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pay-token" className="text-sm font-bold text-ec-ink">
              Token de tarjeta
            </label>
            <input
              id="pay-token"
              type="text"
              value={cardToken}
              onChange={(e) => setCardToken(e.target.value)}
              disabled={isLoading}
              placeholder="tok_visa"
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

          <button
            type="button"
            onClick={handlePay}
            disabled={isLoading}
            className="btn-primary w-full py-3.5 text-lg"
          >
            {isLoading ? 'Procesando pago…' : `Pagar ${formatPrice(total)}`}
          </button>
          <p className="text-[11px] text-ec-slate text-center">
            Entorno de prueba: los tokens permitidos son provistos por la pasarela de demostración.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayReservationModal;