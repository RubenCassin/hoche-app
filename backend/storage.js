const fs = require('fs');
const path = require('path');

// Dossier de données persistant : volume Railway `/data` en prod (DATABASE_URL
// pointe `file:/data/oche.db`), sinon `backend/db` en local. Les avatars uploadés
// y sont écrits à côté de la base (jamais effacés par un déploiement).
const DATA_DIR = process.env.DATA_DIR
  || (String(process.env.DATABASE_URL || '').includes('/data/') ? '/data' : path.join(__dirname, 'db'));
const AVATAR_DIR = path.join(DATA_DIR, 'avatars');

try { fs.mkdirSync(AVATAR_DIR, { recursive: true }); } catch (e) { /* best-effort */ }

module.exports = { DATA_DIR, AVATAR_DIR };
