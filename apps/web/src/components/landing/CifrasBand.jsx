import React from 'react';
import StatCounter from '@/components/landing/StatCounter.jsx';

/**
 * Banda de "Cifras" institucionales que va justo debajo del hero (estilo Cpech).
 *
 * Muestra siempre 4 métricas. Las tres/cuatro de base son atributos
 * ESTRUCTURALES verdaderos (no inventados): nº de pruebas PAES cubiertas,
 * modalidades, tamaño de grupo y profes locales con CV. Si ya hay un
 * `resultados_paes` publicado con puntaje promedio, la banda lidera con ese
 * número real (y conserva 3 estructurales), como hacen los preus grandes.
 *
 * Props:
 *  - resultados: registro de resultados_paes | null (opcional)
 */
const CifrasBand = ({ resultados }) => {
  const base = [
    { value: 5, label: 'Pruebas PAES que preparamos', eyebrow: 'Cobertura' },
    { value: 3, label: 'Modalidades: presencial, online y mixta', eyebrow: 'Flexible' },
    { value: 25, prefix: '≤', label: 'Alumnos por grupo: grupos chicos', eyebrow: 'Cercanía' },
    { value: 100, suffix: '%', label: 'Profesores locales con CV verificable', eyebrow: 'Equipo' },
  ];

  const puntaje = resultados?.puntaje_promedio_general;
  const items = [];

  if (typeof puntaje === 'number' && puntaje > 0) {
    items.push({
      value: Math.round(puntaje),
      label: 'Puntaje PAES promedio (escala 100–1000)',
      eyebrow: `Promoción ${resultados.anio_promocion}`,
    });
  }
  // Completar hasta 4 con las estructurales.
  for (const b of base) {
    if (items.length >= 4) break;
    items.push(b);
  }

  return (
    <section
      aria-label="PrePa en números"
      className="relative overflow-hidden border-y bg-card"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-30px] left-[8%] h-20 w-20 rounded-full bg-primary/10" />
        <div className="absolute bottom-[-30px] right-[12%] h-24 w-24 rotate-12 rounded-2xl bg-accent/15" />
        <div className="absolute top-1/2 right-[38%] h-10 w-10 rounded-full bg-secondary/15" />
      </div>
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {items.map((it, idx) => (
            <div
              key={it.label}
              className={
                idx > 0
                  ? 'lg:border-l lg:border-border lg:pl-6'
                  : ''
              }
            >
              <StatCounter
                value={it.value}
                prefix={it.prefix}
                suffix={it.suffix}
                eyebrow={it.eyebrow}
                label={it.label}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CifrasBand;
