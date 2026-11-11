import React from 'react';
import { formatPrice, normalizeAtraccion } from '../utils/atraccion';
import { IconCalendar, IconShield } from './icons/EcuadorIcons';

/**
 * Caja de compra estilo Amazon: precio + CTA con alto contraste (figura-fondo).
 * Lista para abrir el flujo de checkout real vía onReserve.
 */
const CheckoutCard = ({
  atraccion,
  onReserve,
  compact = false,
  className = '',
}) => {
  const a = normalizeAtraccion(atraccion);
  if (!a) return null;

  return (
    <aside
      className={`checkout-card ${className}`}
      aria-labelledby={`checkout-title-${a.id}`}
    >
      <div className="rounded-3xl border border-ec-ink/8 bg-white shadow-ec-card overflow-hidden">
        <div className={`${compact ? 'p-4' : 'p-5 md:p-6'} space-y-4`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-[11px] text-ec-slate">
                Precio por persona
              </p>
              <p
                className="font-display text-5xl leading-none mt-1 text-ec-ink tabular-nums"
                aria-label={`Precio ${formatPrice(a.precio_base)}`}
              >
                {formatPrice(a.precio_base)}
              </p>
            </div>
            {!compact && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ec-andes/10 px-3 py-1 text-xs font-bold text-ec-andes">
                <IconShield className="w-4 h-4" />
                Cancelación flexible
              </span>
            )}
          </div>

          <ul className="text-sm text-ec-slate space-y-2 border-t border-ec-ink/8 pt-4" aria-label="Beneficios de reserva">
            <li className="flex gap-2">
              <span className="text-ec-volcano" aria-hidden="true">✓</span>
              Confirmación inmediata vía API
            </li>
            <li className="flex gap-2">
              <span className="text-ec-volcano" aria-hidden="true">✓</span>
              Salida desde {a.codigo_aeropuerto}
            </li>
            {a.capacidad_diaria != null && (
              <li className="flex gap-2">
                <span className="text-ec-volcano" aria-hidden="true">✓</span>
                Hasta {a.capacidad_diaria} plazas/día
              </li>
            )}
          </ul>

          <button
            type="button"
            id={`checkout-title-${a.id}`}
            onClick={() => onReserve?.(a)}
            className="btn-primary w-full min-h-11 py-3 text-base md:text-lg gap-2"
            aria-label={`Reservar ${a.nombre} desde ${formatPrice(a.precio_base)}`}
          >
            <IconCalendar />
            Reservar ahora
          </button>

          <p className="text-center text-xs text-ec-slate">
            No se realiza el cargo hasta confirmar fecha y pasajeros.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default CheckoutCard;
