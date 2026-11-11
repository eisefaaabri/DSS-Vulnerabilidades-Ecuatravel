import React from 'react';
import Reveal from './Reveal';
import TopoLines from './TopoLines';

const ITEMS = [
  {
    title: 'Reserva segura',
    text: 'Tus pagos viajan cifrados con el mismo estándar que usa la banca.',
  },
  {
    title: 'Cupos en tiempo real',
    text: 'La disponibilidad se actualiza al instante para cada atracción.',
  },
  {
    title: 'Soporte 24/7',
    text: 'Te atendemos a cualquier hora, antes y durante tu viaje.',
  },
];

const TrustStrip = () => (
  <section
    id="confianza"
    className="relative overflow-hidden bg-ec-andes text-ec-paper scroll-mt-20"
    aria-labelledby="trust-heading"
  >
    <TopoLines className="pointer-events-none absolute -right-40 -top-24 h-[140%] w-[70%] text-white/10" />
    <div className="relative section-grid py-16 md:py-24 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:gap-16">
      <Reveal>
        <p className="eyebrow text-ec-sand/80">Por qué reservar aquí</p>
        <h2 id="trust-heading" className="mt-3 text-4xl md:text-5xl leading-[1.05] text-white">
          Viajar tranquilo <em className="italic text-ec-sand">también es parte del viaje</em>
        </h2>
      </Reveal>
      <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6 self-end">
        {ITEMS.map((item, i) => (
          <Reveal as="li" key={item.title} delay={i * 90} className="border-t border-white/25 pt-5">
            <span className="font-display text-3xl text-ec-sand tabular-nums">0{i + 1}</span>
            <h3 className="mt-3 font-bold text-white">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/75">{item.text}</p>
          </Reveal>
        ))}
      </ol>
    </div>
  </section>
);

export default TrustStrip;
