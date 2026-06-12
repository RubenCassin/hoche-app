// Remise à zéro totale avant déploiement : ne garde QUE le compte @admin
// (lui-même remis à neuf : zéro partie, zéro social). Sauvegarde auto avant.
// Run :  node backend/resetAccounts.js
const fs = require('fs');
const path = require('path');
const { getDb, saveDb } = require('./db/database');

const DB_PATH = path.join(__dirname, 'db', 'oche-db.json');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backup = DB_PATH.replace(/\.json$/, '.prereset-' + stamp + '.json');
fs.copyFileSync(DB_PATH, backup);
console.log('Sauvegarde →', path.basename(backup));

const db = getDb();
const before = db.users.map((u) => u.username).join(', ');

db.users = db.users.filter((u) => u.username === '@admin');
db.games = [];
db.posts = [];
db.comments = [];
db.follows = [];
db.challenges = [];
db.notifications = [];
// Remet le compte admin à neuf (Elo, badges, push) sans toucher au mot de passe.
db.users.forEach((u) => {
  u.elo = 1000;
  u.eloGames = 0;
  u.flags = 0;
  u.badges = [];
  u.pushTokens = [];
});

saveDb();
console.log('Avant :', before);
console.log('Après :', db.users.map((u) => u.username).join(', ') || '(aucun)');
console.log('Base vierge — toutes les collections sont vides.');
