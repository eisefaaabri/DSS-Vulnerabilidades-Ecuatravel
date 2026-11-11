import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import heroImage from '../assets/hero-andes.jpg';
import { IconChevronRight } from './icons/EcuadorIcons';

const HERO_FALLBACK =
  'https://images.unsplash.com/photo-1590496889812-706f9d371457?auto=format&fit=crop&w=1920&q=80&auto=format';

const REGIONS = [
  { n: '01', label: 'Sierra', sub: 'Volcanes y páramo' },
  { n: '02', label: 'Costa', sub: 'Playas del Pacífico' },
  { n: '03', label: 'Amazonía', sub: 'Selva y ríos' },
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/experiencias?q=${encodeURIComponent(term)}` : '/experiencias');
  };

  return (
    <section
      className="relative -mt-16 md:-mt-[4.5rem] w-full min-h-[min(92svh,820px)] flex items-end overflow-hidden bg-ec-ink"
      aria-labelledby="hero-heading"
    >
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage || HERO_FALLBACK}
          alt="Volcanes andinos y niebla sobre la cordillera ecuatoriana"
          className="w-full h-full object-cover object-center animate-ken-burns will-change-transform"
          loading="eager"
          fetchPriority="high"
          width={1920}
          height={1080}
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ec-ink via-ec-ink/45 to-ec-ink/30"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-ec-ink/70 via-ec-ink/20 to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 section-grid w-full pt-32 pb-10 md:pb-14">
        <div className="max-w-3xl">
          <p className="eyebrow text-ec-sand/90 mb-5 animate-rise" style={{ animationDelay: '80ms' }}>
            Tours y entradas en Ecuador
          </p>

          <h1
            id="hero-heading"
            className="text-[clamp(2.75rem,7.5vw,6rem)] text-white leading-[0.98] animate-rise"
            style={{ animationDelay: '160ms' }}
          >
            Sierra, Costa y Amazonía,{' '}
            <em className="italic text-ec-sand">a un paso del aeropuerto</em>
          </h1>

          <p
            className="mt-6 text-base md:text-lg text-white/80 max-w-lg leading-relaxed animate-rise"
            style={{ animationDelay: '260ms' }}
          >
            Experiencias elegidas cerca de los principales aeropuertos del país. Ves el precio antes de
            reservar y la confirmación llega al momento.
          </p>

          <form
            role="search"
            onSubmit={handleSearch}
            className="mt-8 md:mt-10 flex max-w-xl items-center gap-2 rounded-full bg-ec-paper p-1.5 pl-5 shadow-ec-hero animate-rise focus-within:ring-4 focus-within:ring-ec-volcano/40"
            style={{ animationDelay: '360ms' }}
          >
            <label htmlFor="hero-search" className="sr-only">
              Buscar experiencias
            </label>
            <svg className="w-5 h-5 shrink-0 text-ec-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              id="hero-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cotopaxi, Galápagos, UIO…"
              className="min-w-0 flex-1 bg-transparent py-2 text-base text-ec-ink placeholder:text-ec-slate/70 focus:outline-none"
            />
            <button type="submit" className="btn-primary px-5 sm:px-6 py-2.5 text-sm shrink-0">
              <span className="hidden sm:inline">Buscar</span>
              <IconChevronRight className="w-4 h-4" />
              <span className="sr-only sm:hidden">Buscar</span>
            </button>
          </form>
        </div>

        <ul
          className="mt-14 md:mt-20 grid grid-cols-3 border-t border-white/20 animate-rise"
          style={{ animationDelay: '480ms' }}
          aria-label="Regiones"
        >
          {REGIONS.map((r) => (
            <li key={r.label} className="pt-4 pr-3">
              <span className="block text-[11px] font-bold tabular-nums text-ec-sand/70">{r.n}</span>
              <span className="mt-1 block font-display text-xl md:text-3xl text-white">{r.label}</span>
              <span className="hidden sm:block text-xs md:text-sm text-white/60">{r.sub}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default HeroSection;
