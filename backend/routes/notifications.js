const express = require('express');
const router = express.Router();
const { prisma, jarr } = require('../db/prisma');
const { requireAuth } = require('../auth');

// GET /notifications (auth) — mine, newest first, enriched with actor + snippet.
router.get('/', requireAuth, async function (req, res, next) {
  try {
    const [rows, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),
      prisma.notification.count({ where: { userId: req.userId, read: false } }),
    ]);

    // Charge les entités référencées en lot (pas de N+1).
    const ids = (xs) => [...new Set(xs.filter((x) => x != null))];
    const [actors, posts, games, challenges] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: ids(rows.map((n) => n.actorId)) } } }),
      prisma.post.findMany({ where: { id: { in: ids(rows.map((n) => n.postId)) } } }),
      prisma.game.findMany({ where: { id: { in: ids(rows.map((n) => n.gameId)) } } }),
      prisma.challenge.findMany({ where: { id: { in: ids(rows.map((n) => n.challengeId)) } } }),
    ]);
    const by = (xs) => new Map(xs.map((x) => [x.id, x]));
    const actorBy = by(actors), postBy = by(posts), gameBy = by(games), chBy = by(challenges);

    const items = rows.map(function (n) {
      const actor = n.actorId ? actorBy.get(n.actorId) : null;
      const post = n.postId ? postBy.get(n.postId) : null;
      const game = n.gameId ? gameBy.get(n.gameId) : null;
      const ch = n.challengeId ? chBy.get(n.challengeId) : null;
      return {
        id: n.id,
        type: n.type,
        actorId: n.actorId,
        actorName: actor ? actor.name : 'Joueur',
        postId: n.postId,
        postSnippet: post ? post.text.slice(0, 60) : null,
        gameId: n.gameId,
        badge: n.badge || null,
        challengeId: n.challengeId || null,
        challenge: ch
          ? {
              gameType: ch.gameType,
              legsToWin: ch.legsToWin,
              status: ch.status,
              // Only the recipient of a still-pending challenge can accept/decline.
              pending: ch.status === 'pending' && ch.toId === req.userId,
            }
          : null,
        // From the recipient's POV: if the actor won, the recipient lost.
        match: game
          ? {
              gameType: game.gameType,
              actorWon: game.matchWon,
              actorLegs: game.legsWon,
              oppLegs: Math.max(0, game.legsPlayed - game.legsWon),
              confirmed: game.confirmed,
              pending: !game.confirmed && jarr(game.confirmedBy).indexOf(req.userId) < 0,
            }
          : null,
        read: n.read,
        created_at: n.createdAt.toISOString(),
      };
    });

    res.json({ unread, items });
  } catch (e) { next(e); }
});

// POST /notifications/read — mark all of mine as read.
router.post('/read', requireAuth, async function (req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, read: false },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
