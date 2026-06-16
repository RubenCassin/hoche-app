import { wsUrl, getToken } from './api';

// WebSocket temps réel (singleton) — même protocole que l'app mobile (/ws).
type Listener = (msg: any) => void;
let ws: WebSocket | null = null;
let listeners = new Set<Listener>();
let reconnect: ReturnType<typeof setTimeout> | null = null;
let want = false;

function emit(m: any) { listeners.forEach((l) => { try { l(m); } catch {} }); }

function open() {
  const token = getToken();
  if (!want || !token) return;
  if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
  try { ws = new WebSocket(wsUrl(token)); } catch { schedule(); return; }
  ws.onmessage = (e) => { try { emit(JSON.parse(typeof e.data === 'string' ? e.data : '')); } catch {} };
  ws.onclose = () => { ws = null; emit({ type: '_closed' }); schedule(); };
  ws.onerror = () => {};
}
function schedule() { if (want && !reconnect) reconnect = setTimeout(() => { reconnect = null; open(); }, 2500); }

export function liveConnect() { want = true; open(); }
export function liveDisconnect() {
  want = false;
  if (reconnect) { clearTimeout(reconnect); reconnect = null; }
  if (ws) { try { ws.close(); } catch {} }
  ws = null;
}
export function liveSend(msg: object) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }
export function onLive(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
export function liveReady() { return !!ws && ws.readyState === 1; }
