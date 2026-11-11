import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { AtraccionesService } from './services/api';
import { formatApiError } from './utils/apiErrors';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import TrustStrip from './components/TrustStrip';
import AttractionGallery from './components/AttractionGallery';
import AttractionDetail from './components/AttractionDetail';
import AdminLayout, { RequireRole } from './components/admin/AdminLayout';
import AdminCatalog from './components/admin/AdminCatalog';
import AdminCheckin from './components/admin/AdminCheckin';
import AdminClientes from './components/admin/AdminClientes';
import AdminPersonal from './components/admin/AdminPersonal';
import MyReservations from './components/MyReservations';
import { IconLayers } from './components/icons/EcuadorIcons';
import TopoLines from './components/TopoLines';

const useAtracciones = (limit) => {
  const [atracciones, setAtracciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    AtraccionesService.getAll({ page: 1, limit })
      .then((data) => {
        if (cancelled) return;
        setAtracciones(data.data ?? []);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(formatApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { atracciones, loading, error };
};

const HomePage = () => {
  const { atracciones, loading, error } = useAtracciones(12);

  return (
    <>
      <HeroSection />
      <TrustStrip />
      {error && (
        <div className="section-grid pt-8">
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">
            {error}
          </p>
        </div>
      )}
      <AttractionGallery
        atracciones={atracciones}
        loading={loading}
        limit={6}
        showViewAll
        title="Experiencias destacadas"
        subtitle="Lo más reservado cerca de tu aeropuerto de conexión."
      />
    </>
  );
};

const PER_PAGE = 9;

const buildPageList = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, current - 1, current, current + 1, total]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…');
    out.push(sorted[i]);
  }
  return out;
};

const CatalogPage = () => {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [debQ, setDebQ] = useState(initialQ);
  const [aeropuerto, setAeropuerto] = useState('ALL');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], meta: null });
  const [airports, setAirports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    AtraccionesService.getAll({ page: 1, limit: 100 })
      .then((data) => {
        if (cancelled) return;
        const codes = new Set(
          (data.data ?? []).map((a) => a.codigo_aeropuerto).filter(Boolean),
        );
        setAirports(['ALL', ...Array.from(codes).sort()]);
      })
      .catch(() => {
        /* el catálogo funciona igual sin el filtro de aeropuertos */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = { page, limit: PER_PAGE };
    if (debQ.trim()) params.q = debQ.trim();
    if (aeropuerto !== 'ALL') params.aeropuerto = aeropuerto;
    AtraccionesService.getAll(params)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
      })
      .catch((err) => {
        if (!cancelled) setError(formatApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debQ, aeropuerto, page]);

  const items = result.data ?? [];
  const meta = result.meta ?? null;
  const totalPages = meta?.totalPages ?? 1;
  const from = meta ? (meta.currentPage - 1) * meta.itemsPerPage + 1 : 0;
  const to = meta ? Math.min(meta.currentPage * meta.itemsPerPage, meta.totalItems) : 0;

  const changeQuery = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="pt-10 md:pt-16">
      <div className="section-grid mb-2">
        <p className="eyebrow text-ec-andes animate-rise">Catálogo</p>
        <h1 className="mt-3 text-[clamp(2.5rem,6vw,4.75rem)] leading-[1] text-ec-ink animate-rise" style={{ animationDelay: '80ms' }}>
          Encuentra tu <em className="italic text-ec-volcano">próxima salida</em>
        </h1>
        <p className="mt-4 text-ec-slate max-w-xl leading-relaxed animate-rise" style={{ animationDelay: '160ms' }}>
          Busca por nombre o aeropuerto y reserva directo, sin intermediarios.
        </p>

        <div className="mt-8 flex flex-col gap-4 animate-rise" style={{ animationDelay: '240ms' }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="catalog-search" className="sr-only">
              Buscar experiencias
            </label>
            <div className="relative flex-1">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-ec-slate" aria-hidden="true">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                </svg>
              </span>
              <input
                id="catalog-search"
                type="search"
                placeholder="Buscar por nombre, descripción o aeropuerto…"
                value={q}
                onChange={(e) => changeQuery(setQ)(e.target.value)}
                className="w-full rounded-full border border-ec-ink/12 bg-white/70 pl-12 pr-5 py-3.5 min-h-12 text-base shadow-[0_1px_2px_oklch(0.23_0.025_165/0.05)] transition-[border-color,box-shadow] duration-150 placeholder:text-ec-slate/70 hover:border-ec-ink/25 focus:border-ec-volcano focus:outline-none focus:ring-4 focus:ring-ec-volcano/15"
              />
            </div>
          </div>

          {airports.length > 1 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por aeropuerto">
              {airports.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => changeQuery(setAeropuerto)(code)}
                  aria-pressed={aeropuerto === code}
                  className={[
                    'min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition-[background-color,color,border-color,transform] duration-150 ease-out-ui active:scale-[0.97]',
                    aeropuerto === code
                      ? 'bg-ec-ink text-ec-paper border border-ec-ink'
                      : 'border border-ec-ink/12 text-ec-slate hover:border-ec-ink/40 hover:text-ec-ink',
                  ].join(' ')}
                >
                  {code === 'ALL' ? 'Todos' : code}
                </button>
              ))}
            </div>
          )}
        </div>

        {meta && !loading && (
          <p className="mt-4 text-sm text-ec-slate" role="status" aria-live="polite">
            {meta.totalItems === 0
              ? 'Sin resultados.'
              : `Mostrando ${from}–${to} de ${meta.totalItems} ${meta.totalItems === 1 ? 'experiencia' : 'experiencias'}.`}
            {debQ.trim() && (
              <>
                {' '}para «<strong className="text-ec-ink">{debQ.trim()}</strong>»
              </>
            )}
          </p>
        )}
      </div>

      {error && (
        <div className="section-grid mb-6">
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">
            {error}
          </p>
        </div>
      )}

      <AttractionGallery
        id="catalogo-full"
        atracciones={items}
        loading={loading}
        disableLocalFilter
        title={null}
      />

      {!loading && totalPages > 1 && (
        <nav className="section-grid pt-2 pb-16 md:pb-24" aria-label="Paginación del catálogo">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary px-4 text-sm disabled:opacity-40 disabled:pointer-events-none"
            >
              ← Anterior
            </button>
            {buildPageList(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-ec-slate" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={[
                    'min-h-11 min-w-11 rounded-full px-4 text-sm font-semibold tabular-nums transition-colors duration-150',
                    p === page
                      ? 'bg-ec-ink text-ec-paper'
                      : 'text-ec-slate hover:bg-ec-ink/5 hover:text-ec-ink',
                  ].join(' ')}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary px-4 text-sm disabled:opacity-40 disabled:pointer-events-none"
            >
              Siguiente →
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

const NotFoundPage = () => (
  <div className="section-grid py-24 text-center">
    <p className="eyebrow text-ec-volcano">Error 404</p>
    <h1 className="mt-3 text-5xl md:text-7xl text-ec-ink">
      Este sendero <em className="italic">no lleva a ningún lado</em>
    </h1>
    <p className="mt-4 text-ec-slate">La página que buscas no existe o cambió de lugar.</p>
    <Link to="/" className="btn-primary px-8 py-3 mt-10 inline-flex">
      Volver al inicio
    </Link>
  </div>
);

// Tienda para turistas. El Panel B2B (/admin) tiene su propio layout y menú.
const StoreLayout = () => (
        <div className="min-h-screen flex flex-col bg-ec-paper font-sans text-ec-ink">
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        <Navbar />

        <main id="main-content" className="flex-grow" tabIndex={-1}>
          <Outlet />
        </main>

        <footer className="relative overflow-hidden bg-ec-ink text-ec-paper/70">
          <TopoLines className="pointer-events-none absolute -left-32 -bottom-40 h-[160%] w-[60%] text-white/[0.06]" />
          <div className="relative section-grid pt-16 md:pt-24 pb-10">
            <div className="grid gap-12 md:grid-cols-[1.4fr_1fr] md:items-end">
              <div>
                <p className="font-display text-4xl md:text-6xl leading-[1.02] text-ec-paper max-w-xl">
                  Ecuador cabe en <em className="italic text-ec-sand">un fin de semana</em>.
                </p>
                <Link to="/experiencias" className="btn-primary mt-8 px-7 py-3 text-sm">
                  Explorar experiencias
                </Link>
              </div>
              <nav className="flex flex-wrap gap-x-8 gap-y-1 text-sm font-semibold md:justify-end" aria-label="Enlaces del sitio">
                <Link to="/experiencias" className="min-h-11 inline-flex items-center hover:text-white transition-colors">Catálogo</Link>
                <Link to="/#confianza" className="min-h-11 inline-flex items-center hover:text-white transition-colors">Confianza</Link>
                <Link to="/mis-reservas" className="min-h-11 inline-flex items-center hover:text-white transition-colors">Mis reservas</Link>
              </nav>
            </div>
            <div className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 font-semibold text-ec-paper">
                <IconLayers className="w-5 h-5 text-ec-sand" />
                Ecuador Travel Hub
              </span>
              <p className="text-ec-paper/50">© {new Date().getFullYear()} Ecuador Travel Marketplace</p>
            </div>
          </div>
        </footer>
      </div>
);

const App = () => (
  <Router>
    <AuthProvider>
      <WishlistProvider>
        <Routes>
          <Route element={<StoreLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/experiencias" element={<CatalogPage />} />
            <Route path="/experiencias/:id" element={<AttractionDetail />} />
            <Route path="/mis-reservas" element={<MyReservations />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<RequireRole roles={['ADMIN']}><AdminCatalog /></RequireRole>} />
            <Route path="reservas" element={<AdminCheckin />} />
            <Route path="clientes" element={<AdminClientes />} />
            <Route path="personal" element={<RequireRole roles={['ADMIN']}><AdminPersonal /></RequireRole>} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </WishlistProvider>
    </AuthProvider>
  </Router>
);

export default App;
