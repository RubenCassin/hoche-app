// ─── Sons d'ambiance (web, synthétisés via WebAudio) ─────────────────────────
// Équivalent web de services/soundService.ts : 180, checkout de leg, bust,
// victoire. Pas d'asset à charger — tout est synthétisé. Réglage On/Off device.
const KEY = 'hoche.web.sounds';
let enabled = localStorage.getItem(KEY) !== '0';
export function soundsEnabled() { return enabled; }
export function setSoundsEnabled(v: boolean) { enabled = v; localStorage.setItem(KEY, v ? '1' : '0'); }

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  try { if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); return ctx; } catch { return null; }
}
function tone(freq: number, start: number, dur: number, type: OscillatorType, peak: number) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(c.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

export type Cue = '180' | 'checkout' | 'bust' | 'win';
export function play(cue: Cue) {
  if (!enabled) return;
  const c = ac(); if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  switch (cue) {
    case '180': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.18, 'square', 0.18)); break;
    case 'checkout': [784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.22, 'triangle', 0.2)); break;
    case 'bust': tone(196, 0, 0.28, 'sawtooth', 0.22); tone(146, 0.08, 0.3, 'sawtooth', 0.18); break;
    case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.28, 'square', 0.2)); break;
  }
}
