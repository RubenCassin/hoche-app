// Shared real-time WebSocket: one connection per app, kept alive while signed in.
// Used by the live-match screen AND the global invite listener, so a "challenge
// live" reaches a friend anywhere in the app.
import { socketUrl } from './api';

type Listener = (msg: any) => void;

let ws: WebSocket | null = null;
let token: string | null = null;
let listeners = new Set<Listener>();
let connected = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function emit(msg: any) {
  listeners.forEach((l) => {
    try { l(msg); } catch { /* ignore */ }
  });
}

function open() {
  if (!token) return;
  if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
  try {
    ws = new WebSocket(socketUrl(token));
  } catch {
    scheduleReconnect();
    return;
  }
  ws.onopen = () => { connected = true; };
  ws.onmessage = (e) => {
    let m: any;
    try { m = JSON.parse(typeof e.data === 'string' ? e.data : ''); } catch { return; }
    emit(m);
  };
  ws.onclose = () => {
    connected = false;
    ws = null;
    emit({ type: '_closed' });
    scheduleReconnect();
  };
  ws.onerror = () => { /* onclose follows */ };
}

function scheduleReconnect() {
  if (!token || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    open();
  }, 3000);
}

/** Connect (or keep) the live socket for a signed-in user. */
export function connectLive(authToken: string | null) {
  if (!authToken) return disconnectLive();
  token = authToken;
  open();
}

export function disconnectLive() {
  token = null;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (ws) { try { ws.close(); } catch { /* ignore */ } }
  ws = null;
  connected = false;
}

export function liveSend(msg: object) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

export function isLiveReady() {
  return connected && !!ws && ws.readyState === 1;
}

/** Subscribe to every incoming message. Returns an unsubscribe fn. */
export function onLive(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
