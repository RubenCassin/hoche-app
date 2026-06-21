import { useEffect, useState } from 'react';

// Flash plein écran sur les grands moments (parité avec MomentOverlay mobile).
// `nonce` change à chaque volée jouée → relance l'animation même si le même
// évènement se répète (deux 180 d'affilée, etc.).
const LABELS: Record<string, { text: string; cls: string }> = {
  '180': { text: '💥 180 !', cls: 'm-amber' },
  bust: { text: 'BUST', cls: 'm-brick' },
  leg: { text: '✓ LEG', cls: 'm-win' },
  set: { text: '🏆 SET', cls: 'm-amber' },
  win: { text: '🏆 MATCH', cls: 'm-amber' },
  shanghai: { text: 'SHANGHAI 💥', cls: 'm-amber' },
  halved: { text: '÷ DIVISÉ', cls: 'm-brick' },
};

export function MomentOverlay({ event, nonce }: { event: string | null; nonce: number }) {
  const [show, setShow] = useState<{ text: string; cls: string } | null>(null);
  useEffect(() => {
    const m = event ? LABELS[event] : null;
    if (!m) return;
    setShow(m);
    const t = setTimeout(() => setShow(null), 1100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
  if (!show) return null;
  return <div className="moment-overlay" key={nonce}><span className={'moment-text ' + show.cls}>{show.text}</span></div>;
}
