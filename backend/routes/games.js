const express = require('express');
const router = express.Router();
const { prisma, gameToApi, jarr, jstr } = require('../db/prisma');
const { requireAuth } = require('../auth');
const { addNotification } = require('../notify');
const { computeStats } = require('../stats');
const { computeBadges } = require('../badges');

const GAME_TYPES = ['x01', 'cricket', 'atc', 'killer', 'shanghai', 'halveit'];

// POST /games  (auth) — save a finished match result attributed to the user.
// If it's a PvP match (real-account opponents), it starts UNCONFIRMED and each
// opponent gets a notification to confirm — so you can't fake a duel result.
router.post('/', requireAuth, async function (req, res, next) {
  try {
    const b = req.body || {};
    const num = function (v) { return typeof v === 'number' && isFinite(v) ? v : 0; };

    const opponentIds = Array.isArray(b.opponentIds)
      ? b.opponentIds.filter(function (n) { return typeof n === 'number'; }).slice(0, 7)
      : [];

    // Per-visit log (X01 only, for the replay screen). Sanitised + capped.
    const visits = Array.isArray(b.visits)
      ? b.visits.slice(0, 200).map(function (v) {
          return {
            total: num(v && v.total),
            bust: !!(v && v.bust),
            darts: Array.isArray(v && v.darts)
              ? v.darts.slice(0, 3).map(function (d) { return String(d).slice(0, 6); })
              : [],
          };
        })
      : [];

    const game = await prisma.game.create({
      data: {
        userId: req.userId,
        gameType: GAME_TYPES.indexOf(b.gameType) >= 0 ? b.gameType : 'x01',
        matchWon: !!b.matchWon,
        legsWon: num(b.legsWon),
        legsPlayed: num(b.legsPlayed),
        opponents: jstr(Array.isArray(b.opponents) ? b.opponents.map(String).slice(0, 7) : []),
        opponentIds: jstr(opponentIds),
        dartsThrown: num(b.dartsThrown),
        avg: num(b.avg),
        total180s: num(b.total180s),
        highestCheckout: num(b.highestCheckout),
        score: num(b.score),
        heatmap: jstr(b.heatmap && typeof b.heatmap === 'object' ? b.heatmap : {}),
        checkoutAttempts: num(b.checkoutAttempts),
        checkoutHits: num(b.checkoutHits),
        doublesHit: num(b.doublesHit),
        first9Points: num(b.first9Points),
        first9Darts: num(b.first9Darts),
        startScore: num(b.startScore),
        visits: jstr(visits),
        // Non-PvP (guests/solo) is auto-confirmed; PvP awaits opponent confirmation.
        confirmed: opponentIds.length === 0,
        confirmedBy: '[]',
      },
    });

    for (const oid of opponentIds) {
      await addNotification(oid, 'match', req.userId, { gameId: game.id });
    }

    // Badge unlocks: recompute the player's earned badges and notify the new ones.
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user) {
      const games = await prisma.game.findMany({ where: { userId: req.userId } });
      const earned = computeBadges(computeStats(games.map(gameToApi), req.userId));
      const current = jarr(user.badges);
      for (const badgeId of earned) {
        if (!current.includes(badgeId)) {
          await addNotification(req.userId, 'badge', req.userId, { badge: badgeId });
        }
      }
      await prisma.user.update({ where: { id: req.userId }, data: { badges: jstr(earned) } });
    }

    res.status(201).json(gameToApi(game));
  } catch (e) { next(e); }
});

// GET /games  (auth) — the user's match history, most recent first.
router.get('/', requireAuth, async function (req, res, next) {
  try {
    const games = await prisma.game.findMany({
      where: { userId: req.userId },
      orderBy: { finishedAt: 'desc' },
    });
    res.json(games.map(gameToApi));
  } catch (e) { next(e); }
});

// GET /games/:id  (auth) — a single match (owner only), for the detail/replay screen.
router.get('/:id', requireAuth, async function (req, res, next) {
  try {
    const game = await prisma.game.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!game) return res.status(404).json({ error: 'Match introuvable' });
    if (game.userId !== req.userId)
      return res.status(403).json({ error: 'Match non accessible' });
    res.json(gameToApi(game));
  } catch (e) { next(e); }
});

// POST /games/:id/confirm — an opponent validates the duel. Once all listed
// opponents have confirmed, the match becomes confirmed (eligible for the feed).
router.post('/:id/confirm', requireAuth, async function (req, res, next) {
  try {
    const game = await prisma.game.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!game) return res.status(404).json({ error: 'Match introuvable' });

    const opponentIds = jarr(game.opponentIds);
    if (!opponentIds.includes(req.userId))
      return res.status(403).json({ error: "Tu n'es pas concerné par ce match" });

    const confirmedBy = jarr(game.confirmedBy);
    if (!confirmedBy.includes(req.userId)) confirmedBy.push(req.userId);
    const confirmed = opponentIds.every(function (id) { return confirmedBy.includes(id); });

    await prisma.game.update({
      where: { id: game.id },
      data: { confirmedBy: jstr(confirmedBy), confirmed },
    });
    // Mark the related notification read.
    await prisma.notification.updateMany({
      where: { gameId: game.id, userId: req.userId },
      data: { read: true },
    });
    res.json({ confirmed });
  } catch (e) { next(e); }
});

// POST /games/:id/reject — an opponent disputes the duel → the match is discarded.
router.post('/:id/reject', requireAuth, async function (req, res, next) {
  try {
    const game = await prisma.game.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!game) return res.status(404).json({ error: 'Match introuvable' });
    if (!jarr(game.opponentIds).includes(req.userId))
      return res.status(403).json({ error: "Tu n'es pas concerné par ce match" });

    await prisma.notification.deleteMany({ where: { gameId: game.id } });
    await prisma.game.delete({ where: { id: game.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
