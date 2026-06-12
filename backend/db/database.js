const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'oche-db.json');
const SCHEMA_VERSION = 9;

function freshDb() {
  return {
    _schema: SCHEMA_VERSION,
    users: [], // { id, name, username, passwordHash, created_at, badges: [] }
    games: [], // finished-match results attributed to a user (see routes/games.js)
    follows: [], // { follower_id, following_id, created_at }
    posts: [], // { id, user_id, text, created_at, likes: [userId] }
    comments: [], // { id, post_id, user_id, text, created_at }
    challenges: [], // { id, from_id, to_id, gameType, legsToWin, message, status, created_at }
    notifications: [], // { id, user_id (recipient), type, actor_id, post_id, game_id, challenge_id, badge, read, created_at }
    _counters: { users: 0, games: 0, posts: 0, comments: 0, notifications: 0, challenges: 0 },
  };
}

/** Add any collections introduced by newer schema versions, preserving data. */
function migrate(db) {
  if (!Array.isArray(db.games)) db.games = [];
  if (!Array.isArray(db.follows)) db.follows = [];
  if (!Array.isArray(db.posts)) db.posts = [];
  if (!Array.isArray(db.comments)) db.comments = [];
  if (!Array.isArray(db.notifications)) db.notifications = [];
  // v5: PvP match confirmation. Legacy games count as already confirmed.
  db.games.forEach(function (g) {
    if (typeof g.confirmed !== 'boolean') g.confirmed = true;
    if (!Array.isArray(g.confirmedBy)) g.confirmedBy = [];
    if (!Array.isArray(g.opponentIds)) g.opponentIds = [];
    // v8: per-visit log + start score for the match-replay screen.
    if (!Array.isArray(g.visits)) g.visits = [];
    if (typeof g.startScore !== 'number') g.startScore = 0;
  });
  db.notifications.forEach(function (n) {
    if (typeof n.game_id === 'undefined') n.game_id = null;
  });
  // v6: per-user location (for the geo leaderboard) + Expo push tokens.
  db.users.forEach(function (u) {
    if (typeof u.country === 'undefined') u.country = null;
    if (typeof u.countryCode === 'undefined') u.countryCode = null;
    if (typeof u.region === 'undefined') u.region = null;
    if (typeof u.city === 'undefined') u.city = null;
    if (!Array.isArray(u.pushTokens)) u.pushTokens = [];
    // v7: earned badges (null sentinel = uninitialised → next game seeds the baseline).
    if (typeof u.badges === 'undefined') u.badges = null;
    // v9: online-duel Elo rating + game count + fair-play flags.
    if (typeof u.elo !== 'number') u.elo = 1000;
    if (typeof u.eloGames !== 'number') u.eloGames = 0;
    if (typeof u.flags !== 'number') u.flags = 0;
  });
  // v7: friend challenges.
  if (!Array.isArray(db.challenges)) db.challenges = [];
  db.notifications.forEach(function (n) {
    if (typeof n.challenge_id === 'undefined') n.challenge_id = null;
    if (typeof n.badge === 'undefined') n.badge = null;
  });
  if (!db._counters) db._counters = {};
  ['users', 'games', 'posts', 'comments', 'notifications', 'challenges'].forEach(function (k) {
    if (typeof db._counters[k] !== 'number') db._counters[k] = 0;
  });
  db._schema = SCHEMA_VERSION;
  return db;
}

function load() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      if (parsed && parsed.users) {
        const migrated = migrate(parsed);
        fs.writeFileSync(DB_PATH, JSON.stringify(migrated, null, 2), 'utf8');
        return migrated;
      }
    } catch (e) {
      // fall through and re-seed
    }
  }
  const initial = freshDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
  console.log('HOCHE DB (re)created — schema v' + SCHEMA_VERSION);
  return initial;
}

let _db = null;

function getDb() {
  if (!_db) _db = load();
  return _db;
}

function saveDb() {
  fs.writeFileSync(DB_PATH, JSON.stringify(_db, null, 2), 'utf8');
}

function nextId(table) {
  const db = getDb();
  db._counters[table] = (db._counters[table] || 0) + 1;
  return db._counters[table];
}

module.exports = { getDb, saveDb, nextId };
