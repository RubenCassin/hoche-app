// Wrapper de PRÉVISUALISATION uniquement (jamais déployé) : pointe le serveur
// sur une base SQLite jetable avant de charger server.js, pour tester l'app
// sans jamais toucher la vraie base (backend/db/oche.db).
const path = require('path');
process.env.DATABASE_URL = 'file:' + path.join(__dirname, 'db', '.smoke.preview.db').replace(/\\/g, '/');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'preview-secret';
process.env.PORT = process.env.PORT || '3199';
require('./server.js');
