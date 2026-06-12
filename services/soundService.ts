// ─── Sons d'ambiance ──────────────────────────────────────────────────────────
// Petits stings synthétisés (assets/sounds/, générés par scripts/genSounds.mjs)
// joués sur les moments forts : 180, checkout de leg, bust, victoire. Le réglage
// on/off est par appareil ('oche.sounds'), exposé dans l'onglet Profil.
//
// Tout est best-effort : si l'audio n'est pas dispo (vieux client Expo Go,
// navigateur restrictif), on se tait sans casser la partie.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/** Aligné sur `Moment` du game store (+ réutilisé par le live online). */
export type GameSound = '180' | 'checkout' | 'bust' | 'matchWon' | 'shanghai';

const SOURCES: Record<GameSound, number> = {
  '180': require('../assets/sounds/ton180.wav'),
  shanghai: require('../assets/sounds/ton180.wav'),
  checkout: require('../assets/sounds/checkout.wav'),
  bust: require('../assets/sounds/bust.wav'),
  matchWon: require('../assets/sounds/win.wav'),
};

const KEY = 'oche.sounds';

let enabled = true;
let ready = false;
const players: Partial<Record<GameSound, AudioPlayer>> = {};

/** À appeler une fois au démarrage (root layout). Idempotent. */
export async function initSounds(): Promise<void> {
  if (ready) return;
  try {
    const stored = await AsyncStorage.getItem(KEY);
    enabled = stored !== '0';
  } catch {}
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    for (const k of Object.keys(SOURCES) as GameSound[]) {
      players[k] = createAudioPlayer(SOURCES[k]);
    }
    ready = true;
  } catch {
    ready = false;
  }
}

export function playSound(sound: GameSound | null | undefined): void {
  if (!sound || !enabled || !ready) return;
  const p = players[sound];
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {}
}

export function soundsEnabled(): boolean {
  return enabled;
}

export function setSoundsEnabled(v: boolean): void {
  enabled = v;
  AsyncStorage.setItem(KEY, v ? '1' : '0').catch(() => {});
}
