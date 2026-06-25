// Identité visuelle HOCHE pour le web — port fidèle de l'OcheMark mobile
// (cible stylisée) en SVG pur, + le wordmark. Couleurs via variables CSS.

// 8 traits de craie autour de la cible (mêmes coordonnées que le mobile).
const TICKS: [number, number, number, number][] = [
  [100, 24, 100, 40], [100, 160, 100, 176], [24, 100, 40, 100], [160, 100, 176, 100],
  [46, 46, 57, 57], [143, 143, 154, 154], [46, 154, 57, 143], [143, 57, 154, 46],
];

export function OcheMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx={100} cy={100} r={92} fill="var(--brick)" />
      <circle cx={100} cy={100} r={76} fill="var(--cream)" />
      <g stroke="var(--walnut)" strokeWidth={2} fill="none">
        {TICKS.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      </g>
      <circle cx={100} cy={100} r={42} fill="var(--walnut)" />
      <circle cx={100} cy={100} r={22} fill="var(--win)" />
      <circle cx={100} cy={100} r={9} fill="var(--amber)" />
    </svg>
  );
}

// Lockup principal : cible + mot HOCHE souligné.
export function HocheLogo({ markSize = 34, wordSize = 26, color = 'var(--amber)', vertical = false }: {
  markSize?: number; wordSize?: number; color?: string; vertical?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center', gap: vertical ? 12 : 10 }}>
      <OcheMark size={markSize} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: vertical ? 'center' : 'flex-start' }}>
        <span className="display" style={{ fontSize: wordSize, lineHeight: 1.02, letterSpacing: wordSize * 0.16, color }}>HOCHE</span>
        <span style={{ height: 2, alignSelf: 'stretch', background: color, marginTop: wordSize * 0.06 }} />
      </div>
    </div>
  );
}

// Icône cloche (notifications) — SVG, plus de 🔔 emoji.
export function BellIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
