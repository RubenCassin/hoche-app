// Demo dataset for promo screenshots. Idempotent: purges prior `demo:true`
// data (users + everything referencing them) then re-seeds. Never touches real
// accounts. Run:  node backend/seedDemo.js
const bcrypt = require('bcryptjs');
const { getDb, saveDb, nextId } = require('./db/database');

const HASH = bcrypt.hashSync('demo1234', 10);
const now = Date.now();
const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Players (the hero first) ──────────────────────────────────────────────────
const HERO = { name: 'Théo Mercier', username: '@theomercier', cc: 'FR', country: 'France', city: 'Lyon', region: 'Auvergne-Rhône-Alpes', elo: 1487, eloGames: 41, avg: 76, games: 26, winRate: 0.73 };
const POOL = [
  ['Lucas Bernard', '@lucasb', 'FR', 'France', 1442, 38, 72, 0.66],
  ['Emma Laurent', '@emmal', 'FR', 'France', 1398, 30, 69, 0.61],
  ['Hugo Petit', '@hugop', 'FR', 'France', 1356, 27, 66, 0.58],
  ['Chloé Moreau', '@chloem', 'FR', 'France', 1310, 22, 63, 0.55],
  ['Nathan Roux', '@nathanr', 'FR', 'France', 1288, 19, 61, 0.52],
  ['Manon Girard', '@manong', 'FR', 'France', 1255, 16, 59, 0.5],
  ['Enzo Fontaine', '@enzof', 'FR', 'France', 1224, 14, 57, 0.48],
  ['Jade Lefevre', '@jadel', 'FR', 'France', 1198, 12, 55, 0.46],
  ['Liam O\'Brien', '@liamob', 'GB', 'United Kingdom', 1465, 44, 74, 0.69],
  ['Oliver Smith', '@olivers', 'GB', 'United Kingdom', 1372, 28, 67, 0.59],
  ['Amelia Jones', '@ameliaj', 'GB', 'United Kingdom', 1301, 21, 62, 0.54],
  ['Jack Wilson', '@jackw', 'GB', 'United Kingdom', 1268, 18, 60, 0.51],
  ['Lars Müller', '@larsm', 'DE', 'Germany', 1420, 33, 70, 0.63],
  ['Mia Schäfer', '@mias', 'DE', 'Germany', 1334, 24, 64, 0.56],
  ['Finn Weber', '@finnw', 'DE', 'Germany', 1276, 17, 60, 0.5],
  ['Sofía García', '@sofiag', 'ES', 'Spain', 1389, 29, 68, 0.6],
  ['Diego Torres', '@diegot', 'ES', 'Spain', 1312, 22, 63, 0.55],
  ['Daan de Vries', '@daandv', 'NL', 'Netherlands', 1456, 40, 73, 0.67],
  ['Sanne Bakker', '@sanneb', 'NL', 'Netherlands', 1298, 20, 62, 0.53],
  ['Noah Janssens', '@noahj', 'BE', 'Belgium', 1345, 25, 65, 0.57],
  ['Léa Dubois', '@leadubois', 'FR', 'France', 1233, 15, 58, 0.49],
  ['Tom Garcia', '@tomg', 'FR', 'France', 1180, 11, 54, 0.45],
  ['Inès Robert', '@inesr', 'FR', 'France', 1150, 9, 52, 0.43],
  ['Adam Richard', '@adamr', 'FR', 'France', 1120, 8, 51, 0.42],
  ['Marco Rossi', '@marcor', 'IT', 'Italy', 1361, 26, 66, 0.58],
  ['Giulia Bianchi', '@giuliab', 'IT', 'Italy', 1287, 19, 61, 0.52],
  ['Eric Lindqvist', '@ericl', 'SE', 'Sweden', 1402, 31, 69, 0.62],
  ['Yann Le Gall', '@yannlg', 'FR', 'France', 1090, 6, 49, 0.4],
  ['Sarah Cohen', '@sarahc', 'FR', 'France', 1065, 5, 47, 0.38],
  ['Paul Mercier', '@paulm', 'FR', 'France', 1040, 4, 45, 0.36],
];

// Realistic 501 legs (visit totals sum to 501; checkout last). A couple carry
// per-dart labels for a rich replay screenshot.
function legVisits(spectacular) {
  if (spectacular) {
    // 501 in 15 darts: 140 + 140 + 100 + 81  +  40 ... build to exactly 501.
    return [
      { total: 140, bust: false, darts: ['T20', 'T20', 'S20'] },
      { total: 140, bust: false, darts: ['T20', 'T20', 'S20'] },
      { total: 100, bust: false, darts: ['T20', 'S20', 'S20'] },
      { total: 81, bust: false, darts: ['T19', 'D12'] },
      { total: 40, bust: false, darts: ['D20'] },
    ]; // 140+140+100+81+40 = 501
  }
  const patterns = [
    [140, 60, 100, 60, 81, 60],
    [100, 140, 60, 85, 76, 40],
    [60, 100, 81, 100, 60, 100],
    [140, 100, 41, 80, 100, 40],
  ];
  const p = pick(patterns).slice();
  // Ensure sum is exactly 501 by adjusting the last visit.
  const s = p.reduce((a, b) => a + b, 0);
  p[p.length - 1] += 501 - s;
  return p.map((t) => ({ total: t, bust: false, darts: [] }));
}

const db = getDb();

// ── Purge prior demo data ─────────────────────────────────────────────────────
const demoIds = new Set(db.users.filter((u) => u.demo).map((u) => u.id));
if (demoIds.size) {
  db.games = db.games.filter((g) => !demoIds.has(g.user_id) && !g.demo);
  db.follows = db.follows.filter((f) => !demoIds.has(f.follower_id) && !demoIds.has(f.following_id));
  const removedPosts = new Set(db.posts.filter((p) => demoIds.has(p.user_id)).map((p) => p.id));
  db.posts = db.posts.filter((p) => !demoIds.has(p.user_id));
  db.posts.forEach((p) => { if (Array.isArray(p.likes)) p.likes = p.likes.filter((id) => !demoIds.has(id)); });
  db.comments = db.comments.filter((c) => !demoIds.has(c.user_id) && !removedPosts.has(c.post_id));
  db.challenges = db.challenges.filter((c) => !demoIds.has(c.from_id) && !demoIds.has(c.to_id));
  db.notifications = db.notifications.filter((n) => !demoIds.has(n.user_id) && !demoIds.has(n.actor_id));
  db.users = db.users.filter((u) => !u.demo);
}

// ── Create users ──────────────────────────────────────────────────────────────
function makeUser(name, username, cc, country, elo, eloGames, createdDaysAgo) {
  const u = {
    id: nextId('users'), name, username, passwordHash: HASH,
    created_at: daysAgo(createdDaysAgo),
    country, countryCode: cc, region: null, city: null,
    pushTokens: [], badges: [], elo, eloGames, flags: 0, demo: true,
  };
  db.users.push(u);
  return u;
}

const hero = makeUser(HERO.name, HERO.username, HERO.cc, HERO.country, HERO.elo, HERO.eloGames, 95);
hero.city = HERO.city; hero.region = HERO.region;
const others = POOL.map((p, i) => makeUser(p[0], p[1], p[2], p[3], p[4], p[5], rnd(20, 90)));

// ── Games (drive the leaderboards + stats) ────────────────────────────────────
function makeGame(user, opts) {
  const won = opts.won;
  const avg = opts.avg;
  const legsToWin = opts.legsToWin ?? 3;
  const legsWon = won ? legsToWin : rnd(0, legsToWin - 1);
  const oppLegs = won ? rnd(0, legsToWin - 1) : legsToWin;
  const legsPlayed = legsWon + oppLegs; // total legs in the match (both players)
  const dartsThrown = Math.max(1, legsPlayed) * rnd(15, 21);
  const g = {
    id: nextId('games'),
    user_id: user.id,
    gameType: 'x01',
    matchWon: won,
    legsWon, legsPlayed,
    opponents: opts.opponents ?? ['Invité'],
    opponentIds: opts.opponentIds ?? [],
    dartsThrown,
    avg,
    total180s: opts.s180 ?? (Math.random() < 0.4 ? rnd(1, 4) : 0),
    highestCheckout: opts.checkout ?? pick([0, 0, 40, 60, 76, 100, 121]),
    score: 0, heatmap: {},
    checkoutAttempts: rnd(2, 6), checkoutHits: rnd(1, 3), doublesHit: rnd(2, 8),
    first9Points: Math.round(avg * 3 + rnd(-20, 20)), first9Darts: 9,
    startScore: 501, visits: opts.visits ?? [],
    confirmed: true, confirmedBy: opts.opponentIds ?? [], online: !!opts.online,
    demo: true,
    finished_at: opts.at ?? daysAgo(rnd(1, 60)),
  };
  db.games.push(g);
  return g;
}

// Other players: enough games to rank, stats around their skill.
others.forEach((u, idx) => {
  const skill = POOL[idx][6];
  const wr = POOL[idx][7];
  const n = rnd(5, 12);
  for (let k = 0; k < n; k++) {
    makeGame(u, { won: Math.random() < wr, avg: skill + rnd(-6, 6), s180: Math.random() < 0.3 ? rnd(1, 3) : 0 });
  }
});

// Hero: a strong, *rising* curve + online matches (with visits) vs real opponents.
const heroOpponents = others.slice(0, 8);
const heroAt = (i) => daysAgo(HERO.games - i + 2); // chronological → nice avg curve
for (let i = 0; i < HERO.games; i++) {
  const progress = i / (HERO.games - 1);
  const avg = Math.round(62 + progress * 18 + rnd(-3, 3)); // 62 → ~80
  const won = Math.random() < HERO.winRate;
  const online = i % 3 === 0; // ~1/3 online → show in history with replays
  const opp = online ? pick(heroOpponents) : null;
  makeGame(hero, {
    won, avg,
    s180: Math.random() < 0.6 ? rnd(1, 3) : 0,
    checkout: pick([0, 60, 76, 100, 110, 121, 130]),
    online,
    opponents: opp ? [opp.name] : ['Invité'],
    opponentIds: opp ? [opp.id] : [],
    visits: i % 4 === 0 ? legVisits(i === HERO.games - 1) : [],
    at: heroAt(i),
  });
}

// ── Follows (hero is popular) ─────────────────────────────────────────────────
function follow(a, b) {
  if (a === b) return;
  if (!db.follows.find((f) => f.follower_id === a && f.following_id === b))
    db.follows.push({ follower_id: a, following_id: b, created_at: daysAgo(rnd(1, 80)) });
}
others.slice(0, 22).forEach((u) => follow(u.id, hero.id)); // 22 followers
others.slice(0, 12).forEach((u) => follow(hero.id, u.id)); // hero follows 12 (12 mutuals)
// A bit of cross-following so the network feels alive.
for (let k = 0; k < 40; k++) follow(pick(others).id, pick(others).id);

// ── Feed: posts + likes + comments ────────────────────────────────────────────
const POSTS = [
  [hero.id, 'Premier 9-darter ce soir 🎯🔥 enfin !', 10],
  [others[0].id, 'Nouveau record perso : 81 de moyenne sur un match 😤', 9],
  [hero.id, 'Qui est chaud pour un tournoi ce week-end ? 🏆', 6],
  [others[8].id, 'Big 170 checkout to win the leg 💪', 12],
  [others[2].id, 'Soirée fléchettes au bar, ambiance au top 🍻', 28],
  [others[12].id, 'Endlich Bullseye getroffen unter Druck!', 14],
  [hero.id, '3 victoires d\'affilée, l\'Elo grimpe 📈', 2],
  [others[5].id, 'Bob\'s 27 réussi pour la première fois 🎯', 20],
];
const posts = POSTS.map(([uid, text, d]) => {
  const p = { id: nextId('posts'), user_id: uid, text, created_at: daysAgo(d), likes: [], demo: true };
  // random likers
  const likers = others.concat([hero]).filter(() => Math.random() < 0.4).map((u) => u.id).slice(0, 18);
  p.likes = Array.from(new Set(likers.concat(uid === hero.id ? [] : [hero.id])));
  db.posts.push(p);
  return p;
});
const COMMENTS = [
  [posts[0].id, others[1].id, 'GG mon pote 🙌'],
  [posts[0].id, others[3].id, 'Énorme !'],
  [posts[2].id, others[0].id, 'Présent ! 🔥'],
  [posts[2].id, others[8].id, 'Count me in'],
  [posts[3].id, hero.id, 'Clean finish 👏'],
];
COMMENTS.forEach(([pid, uid, text]) => {
  db.comments.push({ id: nextId('comments'), post_id: pid, user_id: uid, text, created_at: daysAgo(rnd(1, 6)), demo: true });
});

// ── Challenges (hero's "Défis" tab) ───────────────────────────────────────────
const incoming = { id: nextId('challenges'), from_id: others[9].id, to_id: hero.id, gameType: 'x01', legsToWin: 3, message: 'Petit duel ? 😏', status: 'pending', created_at: daysAgo(1), demo: true };
const accepted = { id: nextId('challenges'), from_id: hero.id, to_id: others[0].id, gameType: 'cricket', legsToWin: 1, message: 'Revanche cricket', status: 'accepted', created_at: daysAgo(3), demo: true };
db.challenges.push(incoming, accepted);

// ── Notifications for the hero (rich bell) ────────────────────────────────────
function notif(actor, type, extra) {
  db.notifications.push(Object.assign({
    id: nextId('notifications'), user_id: hero.id, type, actor_id: actor,
    post_id: null, game_id: null, challenge_id: null, badge: null,
    read: false, created_at: daysAgo(rnd(0, 4)),
  }, extra || {}));
}
notif(others[3].id, 'follow');
notif(others[7].id, 'follow');
notif(others[1].id, 'like', { post_id: posts[0].id });
notif(others[3].id, 'comment', { post_id: posts[0].id });
notif(others[9].id, 'challenge', { challenge_id: incoming.id });
notif(others[0].id, 'challenge_result', { challenge_id: accepted.id });

saveDb();

const demoUsers = db.users.filter((u) => u.demo).length;
const demoGames = db.games.filter((g) => g.demo).length;
console.log('SEED OK');
console.log('hero=' + HERO.username + ' / demo1234  | demoUsers=' + demoUsers + ' demoGames=' + demoGames + ' posts=' + posts.length);
