import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatPrice,
  normalizeAtraccion,
  attractionThumbUrl,
} from '../utils/atraccion';
import { IconGlobe } from './icons/EcuadorIcons';
import WishlistButton from './WishlistButton';

const AttractionCard = ({ raw, onReserve }) => {
  const a = normalizeAtraccion(raw);
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgSrc = attractionThumbUrl(raw);
  const desc = a.descripcion || '';
  const showToggle = desc.length > 120;

  return (
    <article className="group flex h-full flex-col">
      <div className="relative overflow-hidden rounded-3xl bg-ec-mist aspect-[4/3] focus-within:ring-2 focus-within:ring-ec-volcano focus-within:ring-offset-4 focus-within:ring-offset-ec-paper">
        <Link to={`/experiencias/${a.id}`} className="absolute inset-0" aria-label={`Ver detalle de ${a.nombre}`}>
          <img
            src={imgSrc}
            alt={`Vista de ${a.nombre}, Ecuador`}
            loading="lazy"
            decoding="async"
            width={600}
            height={450}
            ref={(el) => el?.complete && setImgLoaded(true)}
            onLoad={() => setImgLoaded(true)}
            className={`h-full w-full object-cover transition-[transform,opacity] duration-700 ease-out-ui group-hover:scale-[1.04] ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ec-ink/55 via-transparent to-transparent" aria-hidden="true" />
          <span className="absolute bottom-4 left-4 font-display text-[1.65rem] leading-none text-white tabular-nums">
            <span className="sr-only">Desde </span>
            {formatPrice(a.precio_base)}
            <span className="ml-1 font-sans text-xs font-semibold text-white/75">/ persona</span>
          </span>
        </Link>
        <div className="pointer-events-none absolute top-4 left-4 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-ec-paper/95 px-2.5 py-1 text-[11px] font-bold tracking-wide text-ec-ink">
            <IconGlobe className="w-3.5 h-3.5 text-ec-andes" />
            {a.codigo_aeropuerto}
          </span>
          {a.estado && a.estado !== 'ACTIVA' && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
              {a.estado}
            </span>
          )}
        </div>
        <WishlistButton atraccionId={a.id} className="absolute top-3 right-3 z-10" />
      </div>

      <div className="flex flex-grow flex-col gap-2 px-1 pt-4">
        {a.duracion && (
          <span className="eyebrow text-[11px] text-ec-andes">{a.duracion} de experiencia</span>
        )}
        <h3 className="text-lg font-bold leading-snug text-ec-ink">
          <Link
            to={`/experiencias/${a.id}`}
            className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 ease-out-ui hover:bg-[length:100%_1px]"
          >
            {a.nombre}
          </Link>
        </h3>

        <div className="text-sm leading-relaxed text-ec-slate">
          <p id={`desc-${a.id}`} className={expanded ? '' : 'line-clamp-2'}>
            {desc || 'Descubre esta experiencia en el detalle del tour.'}
          </p>
          {showToggle && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 min-h-8 rounded text-xs font-bold text-ec-pacific hover:text-ec-pacific-light"
              aria-expanded={expanded}
              aria-controls={`desc-${a.id}`}
            >
              {expanded ? 'Ver menos' : 'Leer más'}
            </button>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-3">
          <button
            type="button"
            onClick={() => onReserve(a)}
            className="btn-ghost px-5 text-sm"
            aria-label={`Reservar ${a.nombre}`}
          >
            Reservar
          </button>
          <Link
            to={`/experiencias/${a.id}`}
            className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-ec-slate transition-colors hover:text-ec-ink"
            tabIndex={-1}
            aria-hidden="true"
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  );
};

export default AttractionCard;
