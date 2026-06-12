// Remise à zéro avant déploiement : supprime tous les comptes tagués
// `demo:true` (screenshots/pub) et leurs données liées — parties, follows,
// posts, likes, commentaires, défis, notifications. Les comptes réels et leurs
// parties ne sont pas touchés. Sauvegarde automatique avant purge.
// Run :  node backend/purgeDemo.js
const fs = require('fs');
const path = require('path');
const { getDb, saveDb } = require('./db/database');

const DB_PATH = path.join(__dirname, 'db', 'oche-db.json');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backup = DB_PATH.replace(/\.json$/, '.prepurge-' + stamp + '.json');
fs.copyFileSync(DB_PATH, backup);
console.log('Sauvegarde →', path.basename(backup));

const db = getDb();
const before = {
  users: db.users.length, games: db.games.length, posts: db.posts.length,
  follows: db.follows.length, comments: (db.comments || []).length,
  challenges: db.challenges.length, notifications: db.notifications.length,
};

const demoIds = new Set(db.users.filter((u) => u.demo).map((u) => u.id));
if (demoIds.size === 0) {
  console.log('Aucun compte démo — rien à purger.');
  process.exit(0);
}

db.games = db.games.filter((g) => !demoIds.has(g.user_id) && !g.demo);
db.follows = db.follows.filter((f) => !demoIds.has(f.follower_id) && !demoIds.has(f.following_id));
const removedPosts = new Set(db.posts.filter((p) => demoIds.has(p.user_id)).map((p) => p.id));
db.posts = db.posts.filter((p) => !demoIds.has(p.user_id));
db.posts.forEach((p) => { if (Array.isArray(p.likes)) p.likes = p.likes.filter((id) => !demoIds.has(id)); });
db.comments = (db.comments || []).filter((c) => !demoIds.has(c.user_id) && !removedPosts.has(c.post_id));
db.challenges = db.challenges.filter((c) => !demoIds.has(c.from_id) && !demoIds.has(c.to_id));
db.notifications = db.notifications.filter((n) => !demoIds.has(n.user_id) && !demoIds.has(n.actor_id));
// Les parties des vrais comptes peuvent référencer des adversaires démo — on
// garde la partie (c'est l'historique du vrai joueur), on ne garde que les ids
// de comptes encore existants pour les liens de profil.
db.games.forEach((g) => {
  if (Array.isArray(g.opponentIds)) g.opponentIds = g.opponentIds.filter((id) => !demoIds.has(id));
});
db.users = db.users.filter((u) => !u.demo);

saveDb();

const after = {
  users: db.users.length, games: db.games.length, posts: db.posts.length,
  follows: db.follows.length, comments: db.comments.length,
  challenges: db.challenges.length, notifications: db.notifications.length,
};
console.log('Purgé', demoIds.size, 'comptes démo.');
for (const k of Object.keys(before)) console.log(`  ${k}: ${before[k]} → ${after[k]}`);
console.log('Comptes restants :', db.users.map((u) => u.username).join(', '));
