// ─── Real-time online X01 over WebSocket ─────────────────────────────────────
// Server-authoritative X01 (configurable 301/501/701, finish mode, first-to-N
// legs). Players self-score a whole-visit total; the server validates
// bust/checkout, tracks turns + legs, broadcasts state, relays chat, handles
// direct live invites (presence), and records a confirmed game per player.

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');
const { prisma, jstr } = require('./db/prisma');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars

/** rooms: code -> { code, quick, configChoice, invitedUserId, players:[{userId,name,ws}], state } */
const rooms = new Map();
/** Presence: userId -> Set<ws> (a user may have the app open in >1 place). */
const clients = new Map();

function send(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}
function sendToUser(userId, msg) {
  const set = clients.get(userId);
  if (set) set.forEach((w) => send(w, msg));
}
function isOnline(userId) {
  return clients.has(userId);
}

function makeCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  } while (rooms.has(code));
  return code;
}

function sanitizeConfig(cfg) {
  cfg = cfg || {};
  const mp = parseInt(cfg.maxPlayers, 10);
  return {
    startScore: [301, 501, 701].indexOf(cfg.startScore) >= 0 ? cfg.startScore : 501,
    legsToWin: [1, 3, 5].indexOf(cfg.legsToWin) >= 0 ? cfg.legsToWin : 3,
    finishMode: ['simple', 'double', 'master'].indexOf(cfg.finishMode) >= 0 ? cfg.finishMode : 'double',
    maxPlayers: mp >= 2 && mp <= 6 ? mp : 2,
  };
}

function freshState(config, n) {
  const fill = (v) => Array.from({ length: n }, () => v);
  return {
    started: false,
    config: config,
    remaining: fill(config.startScore),
    legs: fill(0),
    dartsThrown: fill(0),
    visits: Array.from({ length: n }, () => []),
    turn: 0,
    starter: 0,
    winner: null,
  };
}

function stateMsg(room, youIdx, event) {
  const s = room.state;
  return {
    type: 'state',
    you: youIdx,
    spectator: youIdx < 0,
    names: room.players.map((p) => p.name),
    config: s.config,
    remaining: s.remaining,
    legs: s.legs,
    turn: s.turn,
    winner: s.winner,
    started: s.started,
    event: event || null,
  };
}

/** Lobby (salle multi pas encore démarrée) — qui a rejoint + si je suis l'hôte. */
function lobbyMsg(room, youIdx) {
  return {
    type: 'lobby',
    you: youIdx,
    code: room.code,
    isHost: youIdx === 0,
    names: room.players.map((p) => p.name),
    maxPlayers: room.configChoice.maxPlayers,
    config: room.configChoice,
  };
}
function broadcastLobby(room) {
  room.players.forEach((p, i) => send(p.ws, lobbyMsg(room, i)));
}
function broadcastState(room, event) {
  room.players.forEach((p, i) => send(p.ws, stateMsg(room, i, event)));
  (room.spectators || []).forEach((w) => send(w, stateMsg(room, -1, event)));
}

/** Online presence: which user ids currently hold a live socket. */
function getOnlineUserIds() {
  return Array.from(clients.keys());
}
/** Snapshot of matches in progress (for spectating). */
function getLiveMatches() {
  const out = [];
  for (const room of rooms.values()) {
    if (room.state.started && room.players.length >= 2 && room.state.winner === null) {
      out.push({
        code: room.code,
        names: room.players.map((p) => p.name),
        config: room.state.config,
        legs: room.state.legs,
        spectators: (room.spectators || []).length,
      });
    }
  }
  return out;
}

function startGame(room) {
  const n = room.players.length;
  room.state = freshState(room.configChoice, n);
  room.state.started = true;
  room.rematchVotes = room.players.map(() => false);
  broadcastState(room, 'start');
}

function applyVisit(room, playerIdx, totalRaw) {
  const s = room.state;
  if (!s.started || s.winner !== null) return null;
  if (s.turn !== playerIdx) return null;

  const total = Math.max(0, Math.min(180, Math.floor(Number(totalRaw) || 0)));
  const before = s.remaining[playerIdx];
  const projected = before - total;

  let bust = false;
  let checkout = false;
  if (projected < 0) bust = true;
  else if (projected === 1 && s.config.finishMode !== 'simple') bust = true;
  else if (projected === 0) checkout = true;

  s.visits[playerIdx].push({ total: bust ? 0 : total, bust: bust, darts: [] });
  s.dartsThrown[playerIdx] += 3;
  if (!bust) s.remaining[playerIdx] = projected;

  // 'score' = valid but unremarkable visit — still broadcast, just no banner.
  let event = bust ? 'bust' : total === 180 ? '180' : 'score';

  const n = s.remaining.length;

  if (checkout) {
    s.legs[playerIdx] += 1;
    event = 'leg';
    if (s.legs[playerIdx] >= s.config.legsToWin) {
      s.winner = playerIdx;
      event = 'win';
      recordMatch(room);
      return event;
    }
    // Nouveau leg : on remet tout le monde à zéro, le départ tourne.
    s.remaining = Array.from({ length: n }, () => s.config.startScore);
    s.starter = (s.starter + 1) % n;
    s.turn = s.starter;
    return event;
  }

  s.turn = (s.turn + 1) % n;
  return event;
}

// Elo update for a decided duel. Provisional players (< 10 games) move faster.
// Écrit aussi un point d'historique Elo par joueur (supprimé si signalement).
async function eloApply(winnerId, loserId, gameIds) {
  const [w, l] = await Promise.all([
    prisma.user.findUnique({ where: { id: winnerId } }),
    prisma.user.findUnique({ where: { id: loserId } }),
  ]);
  if (!w || !l) return null;
  const ew = 1 / (1 + Math.pow(10, (l.elo - w.elo) / 400));
  const kw = (w.eloGames || 0) < 10 ? 40 : 24;
  const kl = (l.eloGames || 0) < 10 ? 40 : 24;
  const dw = Math.round(kw * (1 - ew));
  const dl = -Math.round(kl * (1 - ew));

  await prisma.user.update({ where: { id: winnerId }, data: { elo: w.elo + dw, eloGames: { increment: 1 } } });
  await prisma.user.update({ where: { id: loserId }, data: { elo: l.elo + dl, eloGames: { increment: 1 } } });
  const pw = await prisma.eloPoint.create({ data: { userId: winnerId, elo: w.elo + dw, gameId: gameIds[0] || null } });
  const pl = await prisma.eloPoint.create({ data: { userId: loserId, elo: l.elo + dl, gameId: gameIds[1] || null } });
  return { winnerId, loserId, dw, dl, pointIds: [pw.id, pl.id] };
}

async function recordMatch(room) {
  try {
    const s = room.state;
    const n = room.players.length;
    const legsPlayed = s.legs.reduce((a, b) => a + b, 0);
    const avgOf = function (i) {
      const darts = s.dartsThrown[i] || 0;
      const totals = s.visits[i].filter((v) => !v.bust).reduce((sum, v) => sum + v.total, 0);
      return darts > 0 ? Math.round((3 * totals / darts) * 10) / 10 : 0;
    };

    // Anti-cheat: a superhuman winner average earns NO Elo (self-scored, no camera).
    const suspect = avgOf(s.winner) > 140;

    const ids = [];
    for (let i = 0; i < n; i++) {
      const me = room.players[i];
      if (!me) continue;
      const opps = room.players.filter((_, j) => j !== i);
      const g = await prisma.game.create({
        data: {
          userId: me.userId,
          gameType: 'x01',
          matchWon: s.winner === i,
          legsWon: s.legs[i],
          legsPlayed: legsPlayed,
          opponents: jstr(opps.map((p) => p.name)),
          opponentIds: jstr(opps.map((p) => p.userId)),
          dartsThrown: s.dartsThrown[i] || 0,
          avg: avgOf(i),
          total180s: s.visits[i].filter((v) => v.total === 180).length,
          startScore: s.config.startScore,
          visits: jstr(s.visits[i]),
          confirmed: true,
          confirmedBy: jstr(opps.map((p) => p.userId)),
          online: true,
          suspect: suspect,
        },
      });
      ids.push(g.id);
    }
    room.recordedGameIds = ids;

    // Elo : seulement en 1v1 (le classement Elo est pensé pour le duel ;
    // les parties multi 3+ comptent dans les stats/historique mais pas l'Elo).
    if (n === 2 && !suspect) {
      const wUser = room.players[s.winner];
      const lUser = room.players[1 - s.winner];
      if (wUser && lUser) room.eloApplied = await eloApply(wUser.userId, lUser.userId, ids);
    }
  } catch (e) {
    // best-effort
  }
}

function leaveRoom(ws) {
  const code = ws.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  ws.roomCode = null;
  if (!room) return;
  // Un départ termine la salle pour tout le monde (v1 — pas de reprise à chaud).
  const others = room.players.filter((p) => p.ws !== ws);
  (room.spectators || []).forEach((w) => { w.specCode = null; send(w, { type: 'opponent_left' }); });
  rooms.delete(code);
  others.forEach((p) => {
    p.ws.roomCode = null;
    send(p.ws, { type: 'opponent_left' });
  });
}

/** Remove a spectator from whatever room they were watching. */
function leaveSpectate(ws) {
  const code = ws.specCode;
  if (!code) return;
  ws.specCode = null;
  const room = rooms.get(code);
  if (room && room.spectators) {
    const i = room.spectators.indexOf(ws);
    if (i >= 0) room.spectators.splice(i, 1);
  }
}

function handleMessage(ws, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch (e) { return; }
  const type = msg && msg.type;

  if (type === 'create' || type === 'quick') {
    if (ws.roomCode) leaveRoom(ws);
    leaveSpectate(ws);
    if (type === 'quick') {
      for (const room of rooms.values()) {
        if (room.quick && room.players.length === 1 && !room.state.started) {
          room.players.push({ userId: ws.userId, name: ws.userName, ws: ws });
          ws.roomCode = room.code;
          startGame(room);
          return;
        }
      }
    }
    const cfg = type === 'quick' ? sanitizeConfig(null) : sanitizeConfig(msg.config);
    const code = makeCode();
    const room = {
      code: code, quick: type === 'quick', configChoice: cfg, invitedUserId: null, spectators: [],
      players: [{ userId: ws.userId, name: ws.userName, ws: ws }], state: freshState(cfg, cfg.maxPlayers),
    };
    rooms.set(code, room);
    ws.roomCode = code;
    send(ws, { type: 'room', code: code, quick: room.quick, you: 0, config: cfg });
    // Salle multi (3-6) : l'hôte attend dans un lobby et démarre quand il veut.
    if (cfg.maxPlayers > 2) broadcastLobby(room);
    return;
  }

  if (type === 'invite') {
    if (ws.roomCode) leaveRoom(ws);
    leaveSpectate(ws);
    const toUserId = Number(msg.toUserId);
    if (!toUserId || toUserId === ws.userId) return send(ws, { type: 'error', error: 'Invitation invalide' });
    const cfg = sanitizeConfig(msg.config);
    const code = makeCode();
    const room = {
      code: code, quick: false, configChoice: cfg, invitedUserId: toUserId, spectators: [],
      players: [{ userId: ws.userId, name: ws.userName, ws: ws }], state: freshState(cfg, cfg.maxPlayers),
    };
    rooms.set(code, room);
    ws.roomCode = code;
    send(ws, { type: 'room', code: code, quick: false, you: 0, config: cfg, invitedName: msg.toName || null });
    if (isOnline(toUserId)) {
      sendToUser(toUserId, { type: 'invited', code: code, fromName: ws.userName, fromId: ws.userId, config: cfg });
    } else {
      send(ws, { type: 'invite_offline' });
    }
    return;
  }

  if (type === 'decline_invite') {
    const room = rooms.get(String(msg.code || '').toUpperCase());
    if (room && room.players[0]) send(room.players[0].ws, { type: 'invite_declined', byName: ws.userName });
    return;
  }

  if (type === 'join') {
    if (ws.roomCode) leaveRoom(ws);
    leaveSpectate(ws);
    const code = String(msg.code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return send(ws, { type: 'error', error: 'Salon introuvable' });
    const cap = room.configChoice.maxPlayers || 2;
    if (room.state.started) return send(ws, { type: 'error', error: 'La partie a déjà commencé' });
    if (room.players.length >= cap) return send(ws, { type: 'error', error: 'Salon complet' });
    if (room.players.some((p) => p.userId === ws.userId))
      return send(ws, { type: 'error', error: 'Tu es déjà dans ce salon' });
    if (room.invitedUserId && room.invitedUserId !== ws.userId && cap === 2)
      return send(ws, { type: 'error', error: 'Invitation réservée à un autre joueur' });
    room.players.push({ userId: ws.userId, name: ws.userName, ws: ws });
    ws.roomCode = code;
    // 1v1 (ou salle pleine) : démarrage auto. Multi : lobby jusqu'au start de l'hôte.
    if (cap === 2 || room.players.length >= cap) startGame(room);
    else broadcastLobby(room);
    return;
  }

  // Hôte d'une salle multi : démarre la partie (≥ 2 joueurs présents).
  if (type === 'start') {
    const room = rooms.get(ws.roomCode);
    if (!room || room.state.started) return;
    if (room.players[0].ws !== ws) return; // seul l'hôte démarre
    if (room.players.length < 2) return send(ws, { type: 'error', error: 'Il faut au moins 2 joueurs' });
    startGame(room);
    return;
  }

  if (type === 'visit') {
    const room = rooms.get(ws.roomCode);
    if (!room || !room.state.started) return;
    const idx = room.players.findIndex((p) => p.ws === ws);
    if (idx < 0) return;
    const event = applyVisit(room, idx, msg.total);
    if (event !== null) broadcastState(room, event);
    return;
  }

  if (type === 'chat') {
    const room = rooms.get(ws.roomCode);
    if (!room || room.players.length < 2) return;
    const idx = room.players.findIndex((p) => p.ws === ws);
    if (idx < 0) return;
    const text = String(msg.text || '').slice(0, 200).trim();
    if (!text) return;
    const out = { type: 'chat', fromIdx: idx, text: text };
    room.players.forEach((p) => send(p.ws, out));
    (room.spectators || []).forEach((w) => send(w, out));
    return;
  }

  if (type === 'spectate') {
    leaveSpectate(ws);
    const code = String(msg.code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room || !room.state.started) return send(ws, { type: 'error', error: 'Aucun match en direct ici' });
    room.spectators = room.spectators || [];
    if (room.spectators.indexOf(ws) < 0) room.spectators.push(ws);
    ws.specCode = code;
    send(ws, stateMsg(room, -1, null));
    return;
  }

  if (type === 'reaction') {
    const room = rooms.get(ws.roomCode) || rooms.get(ws.specCode);
    if (!room) return;
    const idx = room.players.findIndex((p) => p.ws === ws); // -1 for spectators
    const emoji = String(msg.emoji || '').slice(0, 8);
    if (!emoji) return;
    const out = { type: 'reaction', fromIdx: idx, emoji: emoji };
    room.players.forEach((p) => send(p.ws, out));
    (room.spectators || []).forEach((w) => send(w, out));
    return;
  }

  if (type === 'rematch') {
    const room = rooms.get(ws.roomCode);
    if (!room || room.players.length < 2 || room.state.winner === null) return;
    const idx = room.players.findIndex((p) => p.ws === ws);
    if (idx < 0) return;
    if (!room.rematchVotes || room.rematchVotes.length !== room.players.length) {
      room.rematchVotes = room.players.map(() => false);
    }
    room.rematchVotes[idx] = true;
    if (room.rematchVotes.every(Boolean)) startGame(room);
    else room.players.forEach((p, i) => { if (i !== idx) send(p.ws, { type: 'rematch_offer' }); });
    return;
  }

  if (type === 'report') {
    const room = rooms.get(ws.roomCode);
    if (!room || !Array.isArray(room.recordedGameIds)) return;
    (async function () {
      const opp = room.players.find((p) => p.ws !== ws);
      if (opp) {
        await prisma.user.update({ where: { id: opp.userId }, data: { flags: { increment: 1 } } }).catch(() => {});
      }
      await prisma.game.updateMany({
        where: { id: { in: room.recordedGameIds } },
        data: { reported: true },
      });
      // Reported match: undo the Elo it awarded (cheating shouldn't pay).
      if (room.eloApplied) {
        const ea = room.eloApplied;
        room.eloApplied = null;
        await prisma.user.update({
          where: { id: ea.winnerId },
          data: { elo: { decrement: ea.dw }, eloGames: { decrement: 1 } },
        }).catch(() => {});
        await prisma.user.update({
          where: { id: ea.loserId },
          data: { elo: { decrement: ea.dl }, eloGames: { decrement: 1 } },
        }).catch(() => {});
        // L'historique Elo de ce match disparaît avec lui.
        await prisma.eloPoint.deleteMany({ where: { id: { in: ea.pointIds || [] } } });
      }
      send(ws, { type: 'reported' });
    })().catch(function () { /* best-effort */ });
    return;
  }

  if (type === 'leave') {
    leaveRoom(ws);
    leaveSpectate(ws);
    return;
  }
}

function attachRealtime(server) {
  const wss = new WebSocket.Server({ server: server, path: '/ws' });

  wss.on('connection', function (ws, req) {
    let userId = null;
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      userId = jwt.verify(token, JWT_SECRET).uid;
    } catch (e) {
      send(ws, { type: 'error', error: 'Auth invalide' });
      return ws.close(4001, 'auth');
    }

    // Le handler de messages est branché SYNCHRONE pour ne pas perdre un message
    // (ex. 'create') envoyé juste après l'ouverture, pendant le chargement async
    // du profil. Les messages reçus avant l'auth sont mis en file puis rejoués.
    ws.userId = userId;
    ws.roomCode = null;
    let ready = false;
    const queued = [];
    ws.on('message', function (raw) {
      if (ready) handleMessage(ws, raw);
      else queued.push(raw);
    });
    ws.on('close', function () {
      leaveRoom(ws);
      leaveSpectate(ws);
      const set = clients.get(userId);
      if (set) { set.delete(ws); if (set.size === 0) clients.delete(userId); }
    });
    ws.on('error', function () { leaveRoom(ws); });

    prisma.user.findUnique({ where: { id: userId } })
      .then(function (user) {
        if (!user) return ws.close(4001, 'auth');
        ws.userName = user.name;
        if (!clients.has(userId)) clients.set(userId, new Set());
        clients.get(userId).add(ws);
        ready = true;
        send(ws, { type: 'connected' });
        queued.forEach((raw) => handleMessage(ws, raw));
        queued.length = 0;
      })
      .catch(function () { ws.close(4001, 'auth'); });
  });

  console.log('HOCHE realtime (WebSocket) ready on /ws');
  return wss;
}

/** Pousse un message à plusieurs utilisateurs en ligne (chat temps réel). */
function pushToUsers(userIds, msg) {
  for (const id of userIds) sendToUser(id, msg);
}

module.exports = { attachRealtime, getOnlineUserIds, getLiveMatches, pushToUsers };
