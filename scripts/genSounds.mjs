// Génère les sons d'ambiance (WAV 16-bit mono 44.1 kHz) dans assets/sounds/.
// Zéro dépendance : synthèse directe (sinus/carré/bruit + enveloppes).
// Usage : node scripts/genSounds.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
fs.mkdirSync(OUT, { recursive: true });

const buf = (sec) => new Float32Array(Math.ceil(sec * SR));

/** Ajoute un ton à `b` : freq peut être un nombre ou (t)=>Hz. */
function tone(b, { freq, start = 0, dur, amp = 0.5, type = 'sine', attack = 0.005, decay }) {
  const n0 = Math.floor(start * SR);
  const n1 = Math.min(b.length, n0 + Math.floor(dur * SR));
  let phase = 0;
  for (let i = n0; i < n1; i++) {
    const t = (i - n0) / SR;
    const f = typeof freq === 'function' ? freq(t) : freq;
    phase += (2 * Math.PI * f) / SR;
    let v = Math.sin(phase);
    if (type === 'square') v = v > 0 ? 1 : -1;
    if (type === 'triangle') v = (2 / Math.PI) * Math.asin(Math.sin(phase));
    const envA = Math.min(1, t / attack);
    const envD = decay ? Math.exp(-t / decay) : 1 - t / dur;
    b[i] += v * amp * envA * envD;
  }
}

/** Bruit blanc filtré (passe-bas 1 pôle), enveloppe attack/decay. */
function noise(b, { start = 0, dur, amp = 0.4, cutoff = 2000, attack = 0.01, decay }) {
  const n0 = Math.floor(start * SR);
  const n1 = Math.min(b.length, n0 + Math.floor(dur * SR));
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let lp = 0;
  for (let i = n0; i < n1; i++) {
    const t = (i - n0) / SR;
    lp += k * (Math.random() * 2 - 1 - lp);
    const envA = Math.min(1, t / attack);
    const envD = decay ? Math.exp(-t / decay) : 1 - t / dur;
    b[i] += lp * amp * envA * envD;
  }
}

function writeWav(name, b) {
  // Normalise à -1.5 dB pour garder de la marge.
  let peak = 0;
  for (const v of b) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? 0.84 / peak : 1;
  const data = Buffer.alloc(b.length * 2);
  for (let i = 0; i < b.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, b[i] * g)) * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([h, data]));
  console.log('✓', name, `${((44 + data.length) / 1024).toFixed(0)} ko`);
}

// ── ton180.wav — gros impact + houle de foule (aussi joué sur Shanghai) ───────
{
  const b = buf(1.3);
  tone(b, { freq: (t) => 90 * Math.exp(-t * 6) + 42, dur: 0.6, amp: 0.9, decay: 0.18 }); // boom grave
  noise(b, { dur: 0.12, amp: 0.5, cutoff: 5000, decay: 0.04 }); // claque
  // stab cuivré (accord la majeur, carré feutré)
  for (const [f, d] of [[440, 0], [554, 0.03], [659, 0.06]]) {
    tone(b, { freq: f, start: 0.05 + d, dur: 0.5, amp: 0.16, type: 'square', decay: 0.16 });
  }
  noise(b, { start: 0.12, dur: 1.1, amp: 0.34, cutoff: 1200, attack: 0.25, decay: 0.4 }); // houle de foule
  writeWav('ton180.wav', b);
}

// ── bust.wav — buzzer descendant, sans appel ─────────────────────────────────
{
  const b = buf(0.65);
  tone(b, { freq: 285, dur: 0.18, amp: 0.4, type: 'square', decay: 0.1 });
  tone(b, { freq: 291, dur: 0.18, amp: 0.3, type: 'square', decay: 0.1 }); // battement
  tone(b, { freq: 196, start: 0.22, dur: 0.34, amp: 0.42, type: 'square', decay: 0.14 });
  tone(b, { freq: 201, start: 0.22, dur: 0.34, amp: 0.3, type: 'square', decay: 0.14 });
  writeWav('bust.wav', b);
}

// ── checkout.wav — sting montant de fin de leg ────────────────────────────────
{
  const b = buf(0.9);
  const arp = [523, 659, 784]; // do-mi-sol
  arp.forEach((f, i) => {
    tone(b, { freq: f, start: i * 0.09, dur: 0.3, amp: 0.32, type: 'triangle', decay: 0.12 });
    tone(b, { freq: f * 2, start: i * 0.09, dur: 0.3, amp: 0.1, decay: 0.1 });
  });
  tone(b, { freq: 1046, start: 0.28, dur: 0.55, amp: 0.34, type: 'triangle', decay: 0.2 });
  noise(b, { start: 0.28, dur: 0.4, amp: 0.1, cutoff: 6000, decay: 0.12 }); // brillance
  writeWav('checkout.wav', b);
}

// ── win.wav — fanfare de fin de match ─────────────────────────────────────────
{
  const b = buf(1.9);
  const seq = [392, 523, 659, 784]; // sol-do-mi-sol
  seq.forEach((f, i) => {
    tone(b, { freq: f, start: i * 0.13, dur: 0.26, amp: 0.3, type: 'square', decay: 0.12 });
  });
  // accord final tenu avec vibrato
  for (const f of [523, 659, 784, 1046]) {
    tone(b, { freq: (t) => f * (1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * t)), start: 0.55, dur: 1.25, amp: 0.18, type: 'triangle', decay: 0.5 });
  }
  tone(b, { freq: (t) => 70 * Math.exp(-t * 5) + 38, start: 0.55, dur: 0.5, amp: 0.7, decay: 0.16 }); // boom
  noise(b, { start: 0.6, dur: 1.2, amp: 0.3, cutoff: 1400, attack: 0.2, decay: 0.45 }); // foule
  writeWav('win.wav', b);
}

// ── dart.wav — petit impact sourd (réservé pour plus tard : saisie, etc.) ─────
{
  const b = buf(0.12);
  noise(b, { dur: 0.06, amp: 0.6, cutoff: 900, attack: 0.002, decay: 0.018 });
  tone(b, { freq: 150, dur: 0.08, amp: 0.5, decay: 0.025 });
  writeWav('dart.wav', b);
}
