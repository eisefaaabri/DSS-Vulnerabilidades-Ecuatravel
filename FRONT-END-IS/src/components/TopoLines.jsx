import React, { useMemo } from 'react';

// Curvas de nivel deterministas: cada anillo es un círculo deformado con ondas sinusoidales.
const buildContours = (rings, cx, cy) => {
  const paths = [];
  for (let k = 1; k <= rings; k += 1) {
    const base = k * 34;
    const pts = [];
    for (let i = 0; i <= 96; i += 1) {
      const t = (i / 96) * Math.PI * 2;
      const r =
        base *
        (1 + 0.09 * Math.sin(3 * t + k * 0.45) + 0.05 * Math.sin(5 * t - k * 0.3) + 0.03 * Math.cos(7 * t + k));
      pts.push(`${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * 0.72 * Math.sin(t)).toFixed(1)}`);
    }
    paths.push(`M${pts.join('L')}Z`);
  }
  return paths;
};

const TopoLines = ({ className = '', rings = 14 }) => {
  const paths = useMemo(() => buildContours(rings, 400, 300), [rings]);
  return (
    <svg
      className={className}
      viewBox="0 0 800 600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
};

export default TopoLines;
