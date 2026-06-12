// OCHE Design System — Tokens TypeScript
// Source: OCHE Design System (colors_and_type.css)

import Constants from 'expo-constants';

export const Colors = {
  // Backgrounds
  walnut: '#1A0F08',
  walnutUp: '#221610',
  walnutUp2: '#2B1D15',
  oak: '#4A2818',
  oakLight: '#5C3621',
  parchment: '#F5EFE2',
  paper: '#FFFBF2',

  // Brand
  brick: '#D4421E',
  brickHover: '#E04E2A',
  brickPress: '#B83617',
  amber: '#E8C547',
  amberHover: '#F0D05C',
  amberPress: '#C9A93C',
  // Orange — the warm mid-tone bridging amber (gold) and brick (red).
  orange: '#EE7B2D',
  orangeHover: '#F58C3E',
  orangePress: '#D2661E',
  bull: '#8B1A1A',

  // Text
  cream: '#EBE0C8',
  chalk: '#F2EDE3',

  // Semantic
  win: '#4F7D3C',
  loss: '#8B1A1A',
  info: '#4A6E8A',
  warn: '#C9802E',

  // Foreground helpers (on dark bg)
  fg1: '#EBE0C8',     // primary text
  fg2: '#B8AC95',     // secondary text
  fg3: '#847A68',     // tertiary / disabled
  fgAccent: '#E8C547',
  fgBrand: '#D4421E',
  fgInverse: '#1A0F08',

  // Foreground helpers (on light bg)
  fgOnLight1: '#1A0F08',
  fgOnLight2: '#4A3E2E',
  fgOnLight3: '#847A68',

  // Borders (canonical: border-1 = solid oak, border-2 = translucent oak)
  border1: '#4A2818',              // on dark — solid oak
  border2: 'rgba(75,40,24,0.5)',
  borderOnLight1: 'rgba(26,15,8,0.15)',
  borderOnLight2: 'rgba(26,15,8,0.08)',

  // Surface
  bg1: '#1A0F08',
  bg2: '#221610',
  bg3: '#2B1D15',
  bgOnLight1: '#F5EFE2',
  bgOnLight2: '#EDE3D0',
  bgOnLight3: '#E5D7BC',

  // On-accent text — fixed in BOTH schemes (brick/amber surfaces never flip).
  onBrick: '#F5EFE2',
  onAmber: '#1A0F08',
};

export type Palette = typeof Colors;
export type Scheme = 'dark' | 'light';

// Light scheme — same keys as `Colors`, grounds + neutral text/borders flipped,
// brand accents kept. Built by spreading the dark palette then overriding.
const LightColors: Palette = {
  ...Colors,
  // Grounds → parchment family
  walnut: '#EFE7D6',
  walnutUp: '#F7F1E4',
  walnutUp2: '#FFFBF2',
  oak: '#CDBb9C',
  oakLight: '#D8C9AE',
  // Neutral text → dark on light
  cream: '#1A0F08',
  chalk: '#26190E',
  fg1: '#1A0F08',
  fg2: '#5A4D3A',
  fg3: '#8A7C68',
  fgInverse: '#F5EFE2',
  // Borders → subtle dark
  border1: 'rgba(26,15,8,0.18)',
  border2: 'rgba(26,15,8,0.10)',
  // Surface aliases
  bg1: '#EFE7D6',
  bg2: '#F7F1E4',
  bg3: '#FFFBF2',
};

export const PALETTES: Record<Scheme, Palette> = {
  dark: Colors,
  light: LightColors,
};

export const Typography = {
  fontDisplay: 'BigShouldersDisplay',
  fontBody: 'Manrope',
  fontMono: 'JetBrainsMono',
};

export const FontSizes = {
  // Display scale (Big Shoulders Display)
  displayXXL: { size: 96, lineHeight: 88, tracking: -2, weight: '900' },
  displayXL:  { size: 64, lineHeight: 60, tracking: -1.5, weight: '800' },
  displayLg:  { size: 48, lineHeight: 48, tracking: -1, weight: '800' },
  displayMd:  { size: 36, lineHeight: 36, tracking: -0.5, weight: '700' },
  displaySm:  { size: 28, lineHeight: 30, tracking: -0.25, weight: '700' },

  // Heading scale (Manrope)
  h1: { size: 24, lineHeight: 30, weight: '700' },
  h2: { size: 20, lineHeight: 26, weight: '700' },
  h3: { size: 18, lineHeight: 24, weight: '600' },
  h4: { size: 16, lineHeight: 22, weight: '600' },
  h5: { size: 14, lineHeight: 20, weight: '600' },

  // Body scale (Manrope)
  bodyLg: { size: 16, lineHeight: 24, weight: '400' },
  bodyMd: { size: 14, lineHeight: 21, weight: '400' },
  bodySm: { size: 12, lineHeight: 18, weight: '400' },
  bodyXS: { size: 11, lineHeight: 16, weight: '400' },

  // Label scale
  labelLg: { size: 14, tracking: 0.5 },
  labelMd: { size: 12, tracking: 0.5 },
  labelSm: { size: 10, tracking: 1 },

  // Mono scale (JetBrains Mono)
  monoMd: { size: 14 },
  monoSm: { size: 12 },
};

export const Spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 48,
  s16: 64,
  s20: 80,
  s24: 96,
};

// OCHE UI library is fully square — every surface uses a solid oak border with
// no rounding. The radius scale is kept (for API stability) but flattened to 0.
export const Radii = {
  none: 0,
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  pill: 0,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 12,
  },
  glowAmber: {
    shadowColor: '#E8C547',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
  glowBrick: {
    shadowColor: '#D4421E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
  glowOrange: {
    shadowColor: '#EE7B2D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
};

// Accent-matched glow helpers for selected cards / chips (colour passed in).
export const glow = (color: string) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 16,
  elevation: 8,
});
export const glowSoft = (color: string) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.35,
  shadowRadius: 9,
  elevation: 4,
});

export const Durations = {
  micro: 150,
  std: 220,
  screen: 350,
  flip: 250,
  flash: 200,
};

// Header height
export const HEADER_HEIGHT = 56;
export const TAB_BAR_HEIGHT = 64;

// ─── API Base URL ───────────────────────────────────────────────────────────
// On a phone, "localhost" means the phone itself. Expo already tells us the dev
// machine's LAN IP (the host serving Metro) — reuse it so the API "just works"
// on the same Wi-Fi. Override with EXPO_PUBLIC_API_URL if needed.
const BACKEND_PORT = 3001;

function resolveApiBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override;

  // e.g. hostUri = "192.168.1.40:8081" → take the host part.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    // @ts-ignore — legacy/runtime fallbacks
    (Constants as any).expoGoConfig?.hostUri ||
    // @ts-ignore
    (Constants as any).manifest2?.extra?.expoGo?.host ||
    '';
  const host = String(hostUri).split(':')[0];
  if (host) return `http://${host}:${BACKEND_PORT}`;

  // Web exporté (pas de Metro) : l'API vit sur la même machine que la page.
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:${BACKEND_PORT}`;
  }

  return `http://localhost:${BACKEND_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();
