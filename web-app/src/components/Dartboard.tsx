import { useRef, type ReactElement } from 'react';

type Mod = 'S' | 'D' | 'T';

// Cible cliquable (parité avec DartboardInput mobile) : on mappe le clic vers un
// segment + multiplicateur, puis on appelle onDart(points, modifier, segment).
// Ordre des secteurs (sens horaire depuis le haut = 12 h).
const WEDGES = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
// Rayons des anneaux en fraction du rayon R (bord externe du double = 1.0).
const R_BULLSEYE = 0.07;
const R_BULL = 0.15;
const R_TRIPLE_IN = 0.45;
const R_TRIPLE_OUT = 0.58;
const R_DOUBLE_IN = 0.85;
const SECTOR = 18;
const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2 - 18; // marge pour les numéros

function polar(r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.sin(rad), CY - r * Math.cos(rad)];
}
function annularSector(rIn: number, rOut: number, a0: number, a1: number): string {
  const [x0o, y0o] = polar(rOut, a0);
  const [x1o, y1o] = polar(rOut, a1);
  const [x1i, y1i] = polar(rIn, a1);
  const [x0i, y0i] = polar(rIn, a0);
  return `M ${x0o} ${y0o} A ${rOut} ${rOut} 0 0 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rIn} ${rIn} 0 0 0 ${x0i} ${y0i} Z`;
}

export function Dartboard({ onDart, onUndo, disabled }: {
  onDart: (points: number, modifier: Mod, segment: number) => void;
  onUndo?: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);

  const handle = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * SIZE;
    const dx = x - CX;
    const dy = y - CY;
    const frac = Math.hypot(dx, dy) / R;

    if (frac > 1.0) { onDart(0, 'S', 0); return; }            // raté
    if (frac <= R_BULLSEYE) { onDart(50, 'D', 25); return; }  // bullseye
    if (frac <= R_BULL) { onDart(25, 'S', 25); return; }      // bull

    const fromTop = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
    const segment = WEDGES[Math.round(fromTop / SECTOR) % WEDGES.length];
    let modifier: Mod = 'S';
    if (frac >= R_TRIPLE_IN && frac < R_TRIPLE_OUT) modifier = 'T';
    else if (frac >= R_DOUBLE_IN) modifier = 'D';
    const mult = modifier === 'T' ? 3 : modifier === 'D' ? 2 : 1;
    onDart(segment * mult, modifier, segment);
  };

  const wedges: ReactElement[] = WEDGES.map((seg, i) => {
    const a0 = i * SECTOR - SECTOR / 2;
    const a1 = i * SECTOR + SECTOR / 2;
    const light = i % 2 === 0;
    const single = light ? 'var(--cream)' : 'var(--walnut)';
    const ring = light ? 'var(--brick)' : 'var(--win)';
    const [lx, ly] = polar(R + 10, i * SECTOR);
    return (
      <g key={seg}>
        <path d={annularSector(R_BULL * R, R_TRIPLE_IN * R, a0, a1)} fill={single} />
        <path d={annularSector(R_TRIPLE_IN * R, R_TRIPLE_OUT * R, a0, a1)} fill={ring} />
        <path d={annularSector(R_TRIPLE_OUT * R, R_DOUBLE_IN * R, a0, a1)} fill={single} />
        <path d={annularSector(R_DOUBLE_IN * R, R, a0, a1)} fill={ring} />
        <text x={lx} y={ly + 4} fill="var(--fg2)" fontSize={12} fontWeight={700} textAnchor="middle">{seg}</text>
      </g>
    );
  });

  return (
    <div className="dartboard-wrap">
      <svg ref={ref} className={'dartboard' + (disabled ? ' disabled' : '')} viewBox={`0 0 ${SIZE} ${SIZE}`} onClick={handle}>
        {wedges}
        <circle cx={CX} cy={CY} r={R_BULL * R} fill="var(--win)" />
        <circle cx={CX} cy={CY} r={R_BULLSEYE * R} fill="var(--brick)" />
      </svg>
      {onUndo && <button className="btn btn-ghost btn-sm" onClick={() => !disabled && onUndo()}>↶ Annuler la fléchette</button>}
    </div>
  );
}
