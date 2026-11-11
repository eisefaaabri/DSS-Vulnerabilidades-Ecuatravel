import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AttractionCard from './AttractionCard';
import CheckoutModal from './CheckoutModal';
import Reveal from './Reveal';

const SkeletonCard = () => (
  <div aria-hidden="true">
    <div className="skeleton aspect-[4/3] rounded-3xl" />
    <div className="px-1 pt-4 space-y-3">
      <div className="skeleton h-3 rounded-full w-1/3" />
      <div className="skeleton h-5 rounded-full w-3/4" />
      <div className="skeleton h-4 rounded-full w-full" />
    </div>
  </div>
);

const AttractionGallery = ({
  atracciones = [],
  loading,
  title = 'Experiencias destacadas',
  subtitle = 'Precios claros, fotos inmersivas y reserva en un clic.',
  id = 'catalogo',
  showViewAll = false,
  limit,
  disableLocalFilter = false,
}) => {
  const [selectedAtraccion, setSelectedAtraccion] = useState(null);
  const [airportFilter, setAirportFilter] = useState('ALL');

  const list = useMemo(() => {
    let items = atracciones ?? [];
    if (!disableLocalFilter && airportFilter !== 'ALL') {
      items = items.filter((a) => (a.codigo_aeropuerto ?? a.locations?.[0]?.code) === airportFilter);
    }
    if (limit) items = items.slice(0, limit);
    return items;
  }, [atracciones, airportFilter, limit, disableLocalFilter]);

  const airports = useMemo(() => {
    const codes = new Set(
      (atracciones ?? []).map((a) => a.codigo_aeropuerto ?? a.locations?.[0]?.code).filter(Boolean)
    );
    return ['ALL', ...Array.from(codes).sort()];
  }, [atracciones]);

  return (
    <section
      id={id}
      className={`section-grid scroll-mt-20 ${title ? 'py-16 md:py-24' : 'pt-10 pb-16 md:pb-24'}`}
      aria-labelledby={title ? `${id}-heading` : undefined}
      aria-label={title ? undefined : 'Resultados'}
    >
      {title && (
      <header className="mb-10 md:mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <Reveal className="max-w-2xl">
          <h2 id={`${id}-heading`} className="text-4xl md:text-6xl leading-[1.02] text-ec-ink">
            {title}
          </h2>
          <p className="mt-3 text-ec-slate text-base md:text-lg leading-relaxed">{subtitle}</p>
        </Reveal>

        {!loading && !disableLocalFilter && airports.length > 2 && (
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-airport-filter`} className="text-xs font-bold uppercase tracking-wide text-ec-slate">
              Aeropuerto de salida
            </label>
            <select
              id={`${id}-airport-filter`}
              value={airportFilter}
              onChange={(e) => setAirportFilter(e.target.value)}
              className="min-h-11 rounded-full border border-ec-ink/15 bg-transparent px-4 py-2 text-sm font-semibold text-ec-ink transition-colors hover:border-ec-ink focus:border-ec-volcano focus:ring-2 focus:ring-ec-volcano/30"
            >
              <option value="ALL">Todos</option>
              {airports.filter((c) => c !== 'ALL').map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>
      )}

      {loading ? (
        <div className="catalog-grid" role="status" aria-live="polite" aria-label="Cargando experiencias">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ec-ink/15 px-6 py-16 text-center" role="status">
          <p className="font-display text-3xl text-ec-ink">Nada por aquí todavía</p>
          <p className="mt-2 text-ec-slate">
            Prueba con otro aeropuerto o una búsqueda más corta.
          </p>
        </div>
      ) : (
        <div className="catalog-grid" role="list">
          {list.map((a, i) => (
            <Reveal key={a.id} role="listitem" delay={(i % 3) * 90} className="h-full">
              <AttractionCard raw={a} onReserve={setSelectedAtraccion} />
            </Reveal>
          ))}
        </div>
      )}

      {showViewAll && !loading && (
        <div className="mt-14 md:mt-16 flex justify-center">
          <Link to="/experiencias" className="btn-secondary group px-7 py-3">
            Ver catálogo completo
            <span aria-hidden="true" className="transition-transform duration-200 ease-out-ui group-hover:translate-x-1">→</span>
          </Link>
        </div>
      )}

      {selectedAtraccion && (
        <CheckoutModal
          atraccion={selectedAtraccion}
          isOpen
          onClose={() => setSelectedAtraccion(null)}
        />
      )}
    </section>
  );
};

export default AttractionGallery;
