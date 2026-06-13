// Smoke-test bout-en-bout du backend Prisma (API + WebSocket), à lancer contre
// un serveur démarré sur une base SQLite TEMPORAIRE. Voir tâche de migration.
const WebSocket = require('ws');

const BASE = 'http://localhost:' + (process.env.SMOKE_PORT || 3102);
let failures = 0;

function ok(label, cond, extra) {
  if (cond) console.log('  ✓', label);
  else { failures += 1; console.log('  ✗', label, extra !== undefined ? JSON.stringify(extra) : ''); }
}

async function api(method, path, body, token) {
  const r = await fetch(BASE + path, {
    method,
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      token ? { Authorization: 'Bearer ' + token } : {}
    ),
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await r.json(); } catch (e) {}
  return { status: r.status, json };
}

const GAME = {
  gameType: 'x01', matchWon: true, legsWon: 2, legsPlayed: 3, opponents: ['Invité'],
  opponentIds: [], dartsThrown: 50, avg: 64.2, total180s: 1, highestCheckout: 80,
  score: 0, heatmap: { 20: 12, 19: 4 }, checkoutAttempts: 4, checkoutHits: 2,
  doublesHit: 3, first9Points: 180, first9Darts: 9, startScore: 501,
  visits: [{ total: 100, bust: false, darts: ['T20', 'S20', 'S20'] }, { total: 0, bust: true, darts: ['S20'] }],
};

async function main() {
  console.log('— santé —');
  const h = await api('GET', '/health');
  ok('GET /health', h.status === 200 && h.json.status === 'ok', h.json);

  console.log('— auth —');
  const reg1 = await api('POST', '/auth/register', { name: 'Alice Test', username: 'alice', password: 'alice1234' });
  ok('register alice', reg1.status === 201 && reg1.json.token, reg1.json);
  const reg2 = await api('POST', '/auth/register', { name: 'Bob Test', username: 'bob', password: 'bob12345' });
  ok('register bob', reg2.status === 201, reg2.json);
  const weak = await api('POST', '/auth/register', { name: 'X', username: 'weak', password: 'court' });
  ok('register mdp faible → 400', weak.status === 400);
  const tokA = reg1.json.token, idA = reg1.json.user.id;
  const tokB = reg2.json.token, idB = reg2.json.user.id;
  const login = await api('POST', '/auth/login', { username: 'alice', password: 'alice1234' });
  ok('login alice', login.status === 200 && login.json.user.id === idA);
  const me = await api('GET', '/auth/me', null, tokA);
  ok('GET /auth/me', me.status === 200 && me.json.username === '@alice');
  const patch = await api('PATCH', '/auth/me', { name: 'Alice Renommée', avatarUrl: 'https://example.com/a.png' }, tokA);
  ok('PATCH /auth/me (nom+avatar)', patch.status === 200 && patch.json.name === 'Alice Renommée' && patch.json.avatarUrl, patch.json);
  const badPw = await api('PATCH', '/auth/me', { currentPassword: 'faux', newPassword: 'nouveau123' }, tokA);
  ok('PATCH mdp avec mauvais mdp actuel → 401', badPw.status === 401);

  console.log('— games & stats —');
  for (let i = 0; i < 3; i++) {
    const g = await api('POST', '/games', GAME, tokA);
    if (i === 0) ok('POST /games', g.status === 201 && g.json.user_id === idA && g.json.visits.length === 2, g.json);
  }
  const hist = await api('GET', '/games', null, tokA);
  ok('GET /games (3 parties)', hist.status === 200 && hist.json.length === 3);
  const one = await api('GET', '/games/' + hist.json[0].id, null, tokA);
  ok('GET /games/:id (replay)', one.status === 200 && Array.isArray(one.json.visits));
  const forbidden = await api('GET', '/games/' + hist.json[0].id, null, tokB);
  ok('GET /games/:id par un autre → 403', forbidden.status === 403);
  const stats = await api('GET', '/users/' + idA + '/stats', null, tokA);
  ok('stats agrégées (3 matchs, moy 64.2, badges…)', stats.status === 200 && stats.json.matches_played === 3 && stats.json.three_dart_avg === 64.2, stats.json);
  const notifA = await api('GET', '/notifications', null, tokA);
  ok('notif badge débloqué', notifA.status === 200 && notifA.json.items.some((n) => n.type === 'badge'), notifA.json.items);

  console.log('— social —');
  const fol = await api('POST', '/social/follow/' + idB, null, tokA);
  ok('follow A→B', fol.status === 200 && fol.json.following === true);
  await api('POST', '/social/follow/' + idA, null, tokB);
  const search = await api('GET', '/social/search?q=bob', null, tokA);
  ok('search bob (mutual)', search.status === 200 && search.json[0] && search.json[0].mutual === true, search.json);
  const profile = await api('GET', '/users/' + idB + '/profile', null, tokA);
  ok('profil B (relation mutual)', profile.status === 200 && profile.json.relation.mutual === true);

  console.log('— posts & feed —');
  const post = await api('POST', '/posts', { text: 'Premier 180 de la soirée !' }, tokA);
  ok('POST /posts', post.status === 201, post.json);
  const like = await api('POST', '/posts/' + post.json.id + '/like', null, tokB);
  ok('like', like.status === 200 && like.json.liked === true);
  const com = await api('POST', '/posts/' + post.json.id + '/comment', { text: 'GG !' }, tokB);
  ok('comment', com.status === 201);
  const feed = await api('GET', '/feed?scope=friends', null, tokB);
  ok('feed friends contient le post', feed.status === 200 && feed.json.some((it) => it.kind === 'post' && it.postId === post.json.id), feed.json.length);

  console.log('— défis —');
  const ch = await api('POST', '/challenges', { toUserId: idB, gameType: 'x01', legsToWin: 3, message: 'Chiche ?' }, tokA);
  ok('défi A→B', ch.status === 201);
  const acc = await api('POST', '/challenges/' + ch.json.id + '/accept', null, tokB);
  ok('B accepte', acc.status === 200 && acc.json.status === 'accepted');

  console.log('— classements —');
  const lb = await api('GET', '/leaderboard?scope=world', null, tokA);
  ok('leaderboard (A a 3 parties)', lb.status === 200 && lb.json.some((r) => r.id === idA), lb.json);
  const lg = await api('GET', '/league', null, tokA);
  ok('league (division + entrées)', lg.status === 200 && lg.json.division && lg.json.entries.length >= 1, lg.json);

  console.log('— blocage —');
  const reg3 = await api('POST', '/auth/register', { name: 'Carl Lourd', username: 'carl', password: 'carl1234' });
  const tokC = reg3.json.token, idC = reg3.json.user.id;
  await api('POST', '/social/follow/' + idA, null, tokC);
  const blk = await api('POST', '/social/block/' + idC, null, tokA);
  ok('A bloque C', blk.status === 200 && blk.json.blocked === true);
  const search2 = await api('GET', '/social/search?q=carl', null, tokA);
  ok('C absent de la recherche de A', search2.status === 200 && !search2.json.some((u) => u.id === idC));
  const chBlocked = await api('POST', '/challenges', { toUserId: idA }, tokC);
  ok('C ne peut plus défier A → 403', chBlocked.status === 403);
  const blockedList = await api('GET', '/social/blocked', null, tokA);
  ok('liste des bloqués', blockedList.status === 200 && blockedList.json.some((u) => u.id === idC));
  const unblk = await api('DELETE', '/social/block/' + idC, null, tokA);
  ok('déblocage', unblk.status === 200);

  console.log('— chat —');
  const conv = await api('POST', '/chat/conversations', { userId: idB }, tokA);
  ok('crée conversation directe A↔B', conv.status === 201 && conv.json.id && !conv.json.isGroup, conv.json);
  const convId = conv.json.id;
  const dup = await api('POST', '/chat/conversations', { userId: idA }, tokB);
  ok('réutilise la même conversation (dédup)', dup.status === 200 && dup.json.id === convId, dup.json);
  const send1 = await api('POST', '/chat/conversations/' + convId + '/messages', { text: 'Salut !' }, tokA);
  ok('A envoie un message', send1.status === 201 && send1.json.text === 'Salut !');
  const msgs = await api('GET', '/chat/conversations/' + convId + '/messages', null, tokB);
  ok('B lit le fil', msgs.status === 200 && msgs.json.length === 1 && msgs.json[0].senderId === idA);
  const unreadB = await api('GET', '/chat/unread', null, tokB);
  ok('B a 1 non-lu', unreadB.status === 200 && unreadB.json.unread === 1, unreadB.json);
  await api('POST', '/chat/conversations/' + convId + '/read', null, tokB);
  const unreadB2 = await api('GET', '/chat/unread', null, tokB);
  ok('non-lus à 0 après lecture', unreadB2.status === 200 && unreadB2.json.unread === 0);
  const grp = await api('POST', '/chat/conversations', { name: 'Les potes', memberIds: [idB] }, tokA);
  ok('crée un groupe', grp.status === 201 && grp.json.isGroup && grp.json.members.length === 2, grp.json);
  const inv = await api('POST', '/chat/conversations/' + grp.json.id + '/messages', { text: '', kind: 'match_invite', meta: { code: 'WXYZ' } }, tokA);
  ok('poste une invitation de match', inv.status === 201 && inv.json.kind === 'match_invite' && inv.json.meta.code === 'WXYZ', inv.json);
  const convList = await api('GET', '/chat/conversations', null, tokA);
  ok('liste des conversations (2)', convList.status === 200 && convList.json.length === 2);

  console.log('— duel WebSocket (301, 1 leg) —');
  await wsDuel(tokA, tokB, idA, idB);

  console.log('— partie multi 3 joueurs (lobby + start hôte) —');
  const eloBefore = (await api('GET', '/users/' + idA, null, tokB)).json.elo;
  await ws3(tokA, tokB, tokC, idA, eloBefore);

  console.log('— suppression de compte —');
  const del = await api('DELETE', '/auth/me', { password: 'carl1234' }, tokC);
  ok('DELETE /auth/me (C)', del.status === 200);
  const gone = await api('POST', '/auth/login', { username: 'carl', password: 'carl1234' });
  ok('login C → 401 après suppression', gone.status === 401);

  console.log(failures === 0 ? '\nTOUS LES TESTS PASSENT ✓' : '\n' + failures + ' ÉCHEC(S) ✗');
  process.exit(failures === 0 ? 0 : 1);
}

function wsDuel(tokA, tokB, idA, idB) {
  return new Promise(function (resolve) {
    const url = BASE.replace('http', 'ws') + '/ws?token=';
    const a = new WebSocket(url + tokA);
    const b = new WebSocket(url + tokB);
    let code = null;
    let wins = null;
    const timer = setTimeout(function () { ok('duel terminé (timeout!)', false); cleanup(); }, 15000);

    function cleanup() {
      clearTimeout(timer);
      try { a.close(); } catch (e) {}
      try { b.close(); } catch (e) {}
      // Vérifie l'enregistrement + l'Elo après une courte pause (écriture async).
      setTimeout(async function () {
        const gA = await api('GET', '/games', null, tokA);
        const online = gA.json.filter((g) => g.online);
        ok('partie online enregistrée pour A', online.length === 1 && online[0].opponentIds[0] === idB, online);
        const uA = await api('GET', '/users/' + idA, null, tokB);
        const uB = await api('GET', '/users/' + idB, null, tokA);
        ok('Elo appliqué (A gagne : >1000, B <1000)', uA.json.elo > 1000 && uB.json.elo < 1000, { a: uA.json.elo, b: uB.json.elo });
        const eh = await api('GET', '/users/' + idA + '/elo-history', null, tokA);
        ok('historique Elo écrit', eh.status === 200 && eh.json.length === 1, eh.json);
        resolve();
      }, 600);
    }

    function play(ws, st) {
      // A (you=0) joue parfait, B (you=1) score faible → A gagne vite.
      if (!st.started || st.winner !== null) return;
      const myIdx = st.you;
      if (st.turn !== myIdx) return;
      const rem = st.remaining[myIdx];
      const total = myIdx === 0 ? (rem > 180 ? 100 : rem) : 26; // A checkout dès que possible
      ws.send(JSON.stringify({ type: 'visit', total: total }));
    }

    a.on('open', function () {
      a.send(JSON.stringify({ type: 'create', config: { startScore: 301, legsToWin: 1, finishMode: 'double' } }));
    });
    a.on('message', function (raw) {
      const m = JSON.parse(raw);
      if (m.type === 'room') {
        code = m.code;
        const doJoin = function () { b.send(JSON.stringify({ type: 'join', code: code })); };
        if (b.readyState === WebSocket.OPEN) doJoin();
        else b.on('open', doJoin);
      }
      if (m.type === 'state') {
        if (m.event === 'win') {
          wins = m.winner;
          ok('victoire détectée (A, index 0)', wins === 0, m);
          cleanup();
          return;
        }
        play(a, m);
      }
    });
    b.on('open', function () { /* attend le code via A */ });
    b.on('message', function (raw) {
      const m = JSON.parse(raw);
      if (m.type === 'state' && m.event !== 'win') play(b, m);
    });
    a.on('error', function (e) { ok('ws A sans erreur', false, String(e)); cleanup(); });
    b.on('error', function (e) { ok('ws B sans erreur', false, String(e)); cleanup(); });
  });
}

// Partie à 3 joueurs : A crée une salle maxPlayers=3, B et C rejoignent (lobby),
// A démarre, A ferme 101 d'un coup (finish simple) → gagne. Vérifie l'enregistrement
// à 3 et que l'Elo (1v1 only) n'a PAS bougé.
function ws3(tokA, tokB, tokC, idA, eloBefore) {
  return new Promise(function (resolve) {
    const url = BASE.replace('http', 'ws') + '/ws?token=';
    const a = new WebSocket(url + tokA);
    const b = new WebSocket(url + tokB);
    const c = new WebSocket(url + tokC);
    let code = null;
    let joined = 0;
    let lobbySeen = false;
    let started = false;
    const timer = setTimeout(function () { ok('partie 3j terminée (timeout!)', false); cleanup(); }, 15000);

    function cleanup() {
      clearTimeout(timer);
      [a, b, c].forEach((w) => { try { w.close(); } catch (e) {} });
      setTimeout(async function () {
        const gA = await api('GET', '/games', null, tokA);
        const last = gA.json.filter((g) => g.online).sort((x, y) => y.id - x.id)[0];
        ok('partie multi enregistrée (2 adversaires)', last && last.opponentIds.length === 2, last);
        const eloAfter = (await api('GET', '/users/' + idA, null, tokB)).json.elo;
        ok('Elo inchangé en multi 3j', eloAfter === eloBefore, { eloBefore, eloAfter });
        resolve();
      }, 600);
    }

    const joinWith = (w) => w.send(JSON.stringify({ type: 'join', code: code }));

    // Chaque socket joue quand c'est son tour : l'hôte ferme dès que possible,
    // B et C marquent peu (3) pour ne jamais finir avant l'hôte.
    function playOnTurn(w, m, isHost) {
      if (!m.started || m.winner !== null || m.turn !== m.you) return;
      const rem = m.remaining[m.you];
      const total = isHost ? (rem <= 180 ? rem : 140) : 3;
      w.send(JSON.stringify({ type: 'visit', total: total }));
    }

    a.on('open', function () {
      a.send(JSON.stringify({ type: 'create', config: { startScore: 301, legsToWin: 1, finishMode: 'simple', maxPlayers: 3 } }));
    });
    a.on('message', function (raw) {
      const m = JSON.parse(raw);
      if (process.env.SMOKE_DEBUG) console.log('  [host]', m.type, m.type === 'lobby' ? m.names : (m.type === 'state' ? ('turn=' + m.turn + ' ev=' + m.event) : (m.error || '')));
      if (m.type === 'room') {
        code = m.code;
        [b, c].forEach((w) => { if (w.readyState === WebSocket.OPEN) joinWith(w); else w.on('open', () => joinWith(w)); });
      }
      if (m.type === 'lobby') {
        lobbySeen = true;
        // Démarre quand les 3 sont là (l'hôte lance).
        if (m.names.length === 3 && !started) { started = true; a.send(JSON.stringify({ type: 'start' })); }
      }
      if (m.type === 'state') {
        if (m.event === 'win') { ok('victoire 3j détectée (hôte, index 0) après lobby', m.winner === 0 && lobbySeen, m); cleanup(); return; }
        playOnTurn(a, m, true);
      }
    });
    b.on('message', function (raw) { const m = JSON.parse(raw); if (m.type === 'state' && m.event !== 'win') playOnTurn(b, m, false); });
    c.on('message', function (raw) { const m = JSON.parse(raw); if (m.type === 'state' && m.event !== 'win') playOnTurn(c, m, false); });
    [a, b, c].forEach((w, i) => w.on('error', function (e) { ok('ws 3j #' + i + ' sans erreur', false, String(e)); cleanup(); }));
  });
}

main().catch(function (e) { console.error(e); process.exit(1); });
