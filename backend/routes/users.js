const express = require('express');
const router = express.Router();
const { prisma, userToPublic, gameToApi } = require('../db/prisma');
const { requireAuth } = require('../auth');
const { computeStats } = require('../stats');
const { getFollowing, getFollowers, isFollowing } = require('../relations');

async function statsFor(userId) {
  const games = await prisma.game.findMany({ where: { userId } });
  return computeStats(games.map(gameToApi), userId);
}

// GET /users/:id/stats — aggregate real stats from the user's saved games.
router.get('/:id/stats', requireAuth, async function (req, res, next) {
  try {
    res.json(await statsFor(parseInt(req.params.id, 10)));
  } catch (e) { next(e); }
});

// GET /users/:id/profile — everything a profile page needs in one call.
router.get('/:id/profile', requireAuth, async function (req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Compte introuvable' });

    const [stats, followers, following, iFollow, followsMe, blockRow] = await Promise.all([
      statsFor(id),
      getFollowers(id),
      getFollowing(id),
      isFollowing(req.userId, id),
      isFollowing(id, req.userId),
      prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: req.userId, blockedId: id } },
      }),
    ]);

    res.json({
      user: userToPublic(user),
      stats,
      counts: { followers: followers.size, following: following.size },
      relation: {
        following: iFollow, // viewer → target
        followsMe, // target → viewer
        mutual: iFollow && followsMe,
        isSelf: id === req.userId,
        blocked: !!blockRow, // viewer a bloqué la cible
      },
    });
  } catch (e) { next(e); }
});

// GET /users/:id/h2h — your head-to-head record vs this player (confirmed games).
router.get('/:id/h2h', requireAuth, async function (req, res, next) {
  try {
    const oppId = parseInt(req.params.id, 10);
    const games = await prisma.game.findMany({
      where: { userId: req.userId, confirmed: true, opponentIds: { contains: '' + oppId } },
    });
    let played = 0, won = 0;
    games.forEach(function (g) {
      const api = gameToApi(g);
      if (api.opponentIds.indexOf(oppId) < 0) return; // contains() est un pré-filtre texte
      played += 1;
      if (api.matchWon) won += 1;
    });
    res.json({ played, won, lost: played - won });
  } catch (e) { next(e); }
});

// GET /users/:id/elo-history — l'historique Elo (un point par duel online classé).
router.get('/:id/elo-history', requireAuth, async function (req, res, next) {
  try {
    const points = await prisma.eloPoint.findMany({
      where: { userId: parseInt(req.params.id, 10) },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    res.json(points.map(function (p) {
      return { elo: p.elo, gameId: p.gameId, created_at: p.createdAt.toISOString() };
    }));
  } catch (e) { next(e); }
});

// GET /users/:id — public profile.
router.get('/:id', requireAuth, async function (req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!user) return res.status(404).json({ error: 'Compte introuvable' });
    res.json(userToPublic(user));
  } catch (e) { next(e); }
});

module.exports = router;
