const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const gamesRouter = require('./routes/games');
const feedRouter = require('./routes/feed');
const leaderboardRouter = require('./routes/leaderboard');
const leagueRouter = require('./routes/league');
const liveRouter = require('./routes/live');
const socialRouter = require('./routes/social');
const postsRouter = require('./routes/posts');
const challengesRouter = require('./routes/challenges');
const notificationsRouter = require('./routes/notifications');
const chatRouter = require('./routes/chat');
const { ensureAdmin } = require('./seed');
const { attachRealtime } = require('./realtime');

const app = express();
const PORT = process.env.PORT || 3001;

// Derrière un reverse proxy (Railway/Fly/Nginx), l'IP client arrive via
// X-Forwarded-For — nécessaire pour que le rate-limit /auth vise la bonne IP.
app.set('trust proxy', 1);

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET non défini : le secret de DEV est utilisé. À définir absolument en production.');
}

// Seed a ready-to-use test account (@admin / admin123) on boot.
ensureAdmin().catch(function (e) { console.error('Seed admin impossible :', e.message); });

app.use(cors());
// Les payloads légitimes (parties + replays + heatmap) restent < 100 ko.
app.use(express.json({ limit: '300kb' }));

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/games', gamesRouter);
app.use('/feed', feedRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/league', leagueRouter);
app.use('/live', liveRouter);
app.use('/social', socialRouter);
app.use('/posts', postsRouter);
app.use('/challenges', challengesRouter);
app.use('/notifications', notificationsRouter);
app.use('/chat', chatRouter);

app.get('/health', function (req, res) {
  res.json({ status: 'ok', service: 'HOCHE Backend', version: '2.0.0' });
});

// Gestionnaire d'erreurs JSON — les routes async font next(e).
app.use(function (err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

const server = app.listen(PORT, function () {
  console.log('HOCHE backend running on http://localhost:' + PORT);
});

// Real-time online play shares the same HTTP server (ws:// on /ws).
attachRealtime(server);
