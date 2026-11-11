import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLoginPanel from './AuthLoginPanel';
import { IconLayers } from './icons/EcuadorIcons';

const NAV = [
  { to: '/', label: 'Inicio', match: (p) => p === '/' },
  { to: '/experiencias', label: 'Catálogo', match: (p) => p.startsWith('/experiencias') },
  { to: '/#confianza', label: 'Confianza', match: () => false },
];

const useScrolled = (offset = 24) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [offset]);
  return scrolled;
};

const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, isStaff, session, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const scrolled = useScrolled();
  const path = location.pathname;

  useEffect(() => {
    if (!authOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setAuthOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [authOpen]);

  // Sobre el hero de inicio la barra es transparente; al hacer scroll se vuelve sólida.
  const overHero = path === '/' && !scrolled && !mobileOpen;

  // El Panel B2B solo aparece para el personal (ADMIN u OPERADOR) y abre su propia zona.
  const links = [
    ...NAV,
    ...(isStaff ? [{ to: '/admin', label: 'Panel B2B', match: (p) => p.startsWith('/admin') }] : []),
    ...(isAuthenticated
      ? [{ to: '/mis-reservas', label: 'Mis reservas', match: (p) => p.startsWith('/mis-reservas') }]
      : []),
  ];

  const tone = overHero
    ? { text: 'text-white/80 hover:text-white', active: 'text-white', bar: 'bg-ec-sand' }
    : { text: 'text-ec-slate hover:text-ec-ink', active: 'text-ec-ink', bar: 'bg-ec-volcano' };

  const initial = (session?.email ?? '?').charAt(0).toUpperCase();

  return (
    <>
      <header
        className={[
          'sticky top-0 z-40 transition-[background-color,border-color,box-shadow] duration-200 ease-out-ui',
          overHero
            ? 'bg-transparent border-b border-transparent'
            : 'bg-ec-paper/85 backdrop-blur-lg border-b border-ec-ink/8 shadow-[0_1px_0_oklch(0.23_0.025_165/0.02)]',
        ].join(' ')}
      >
        <div className="section-grid h-16 md:h-[4.5rem] flex items-center justify-between gap-4">
          <Link
            to="/"
            className="group flex items-center gap-2 rounded-lg p-1 -ml-1 shrink-0"
            aria-label="Ecuador Travel — inicio"
          >
            <IconLayers
              className={`w-7 h-7 transition-transform duration-300 ease-out-ui group-hover:-rotate-6 ${
                overHero ? 'text-ec-sand' : 'text-ec-andes'
              }`}
            />
            <span
              className={`font-display text-2xl md:text-[1.7rem] leading-none transition-colors duration-200 ${
                overHero ? 'text-white' : 'text-ec-ink'
              }`}
            >
              Ecuador<em className={overHero ? 'text-ec-sand' : 'text-ec-andes'}>.travel</em>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
            {links.map((item) => {
              const active = item.match(path);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative text-sm font-semibold min-h-11 inline-flex items-center px-3.5 transition-colors duration-150 ${
                    active ? tone.active : tone.text
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={`absolute left-3.5 right-3.5 bottom-2 h-0.5 rounded-full origin-left transition-transform duration-250 ease-out-ui ${tone.bar} ${
                      active ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </Link>
              );
            })}

            {isAuthenticated ? (
              <div className={`ml-3 flex items-center gap-2 pl-4 border-l ${overHero ? 'border-white/20' : 'border-ec-ink/10'}`}>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    overHero ? 'bg-white/15 text-white' : 'bg-ec-andes/10 text-ec-andes'
                  }`}
                  title={session?.email}
                  aria-hidden="true"
                >
                  {initial}
                </span>
                <span className="sr-only">Sesión iniciada como {session?.email}</span>
                <button
                  type="button"
                  onClick={logout}
                  className={`min-h-11 px-3 rounded-full text-sm font-semibold transition-colors ${tone.text}`}
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className={`ml-3 px-5 text-sm ${
                  overHero ? 'btn-secondary border-white/40 text-white hover:bg-white/10 hover:border-white' : 'btn-ghost'
                }`}
              >
                Acceder
              </button>
            )}
          </nav>

          <button
            type="button"
            className={`md:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-full border transition-colors ${
              overHero ? 'border-white/30 text-white' : 'border-ec-ink/15 text-ec-ink'
            }`}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">{mobileOpen ? 'Cerrar menú' : 'Abrir menú'}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h16M4 12h16M4 17h10" />
              )}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <nav
            id="mobile-nav"
            className="md:hidden border-t border-ec-ink/8 bg-ec-paper px-4 pt-2 pb-5 animate-menu-in"
            aria-label="Navegación móvil"
          >
            <ul className="divide-y divide-ec-ink/8">
              {links.map((item) => {
                const active = item.match(path);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between min-h-12 py-3 font-display text-2xl ${
                        active ? 'text-ec-volcano' : 'text-ec-ink'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.label}
                      <span aria-hidden="true" className="text-base text-ec-slate">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="btn-secondary mt-4 w-full"
              >
                Cerrar sesión ({session?.email})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthOpen(true);
                  setMobileOpen(false);
                }}
                className="btn-ghost mt-4 w-full"
              >
                Acceder
              </button>
            )}
          </nav>
        )}
      </header>

      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-ec-ink/60 backdrop-blur-sm animate-backdrop"
            aria-label="Cerrar login"
            onClick={() => setAuthOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Acceder a tu cuenta"
            className="relative z-10 w-full max-w-md bg-ec-paper rounded-3xl shadow-ec-card p-2 max-h-[90vh] overflow-y-auto animate-fade-in"
          >
            <AuthLoginPanel onSuccess={() => setAuthOpen(false)} />
            <button
              type="button"
              className="mt-2 w-full min-h-11 text-sm font-bold text-ec-slate hover:text-ec-ink"
              onClick={() => setAuthOpen(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
