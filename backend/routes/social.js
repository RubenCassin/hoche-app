const express = require('express');
const router = express.Router();
const { prisma, userToPublic } = require('../db/prisma');
const { requireAuth } = require('../auth');
const { getFollowing, getFollowers, blockedIds } = require('../relations');
const { addNotification } = require('../notify');

// POST /social/follow/:id
router.post('/follow/:id', requireAuth, async function (req, res, next) {
  try {
    const target = parseInt(req.params.id, 10);
    if (target === req.userId) return res.status(400).json({ error: 'Impossible de se suivre soi-même' });
    const user = await prisma.user.findUnique({ where: { id: target } });
    if (!user) return res.status(404).json({ error: 'Compte introuvable' });

    const blocked = await blockedIds(req.userId);
    if (blocked.has(target)) return res.status(403).json({ error: 'Ce joueur est bloqué' });

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.userId, followingId: target } },
    });
    if (!existing) {
      await prisma.follow.create({ data: { followerId: req.userId, followingId: target } });
      await addNotification(target, 'follow', req.userId);
    }
    const mutualRow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: target, followingId: req.userId } },
    });
    res.json({ following: true, mutual: !!mutualRow });
  } catch (e) { next(e); }
});

// DELETE /social/follow/:id
router.delete('/follow/:id', requireAuth, async function (req, res, next) {
  try {
    const target = parseInt(req.params.id, 10);
    await prisma.follow.deleteMany({ where: { followerId: req.userId, followingId: target } });
    res.json({ following: false, mutual: false });
  } catch (e) { next(e); }
});

// POST /social/block/:id — bloque un joueur. Coupe le follow dans les deux sens ;
// il disparaît de ta recherche, de ton feed et ne peut plus te défier.
router.post('/block/:id', requireAuth, async function (req, res, next) {
  try {
    const target = parseInt(req.params.id, 10);
    if (target === req.userId) return res.status(400).json({ error: 'Impossible de se bloquer soi-même' });
    const user = await prisma.user.findUnique({ where: { id: target } });
    if (!user) return res.status(404).json({ error: 'Compte introuvable' });

    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.userId, blockedId: target } },
      create: { blockerId: req.userId, blockedId: target },
      update: {},
    });
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: req.userId, followingId: target },
          { followerId: target, followingId: req.userId },
        ],
      },
    });
    res.json({ blocked: true });
  } catch (e) { next(e); }
});

// DELETE /social/block/:id — débloque.
router.delete('/block/:id', requireAuth, async function (req, res, next) {
  try {
    const target = parseInt(req.params.id, 10);
    await prisma.block.deleteMany({ where: { blockerId: req.userId, blockedId: target } });
    res.json({ blocked: false });
  } catch (e) { next(e); }
});

// GET /social/blocked — la liste des joueurs que J'AI bloqués.
router.get('/blocked', requireAuth, async function (req, res, next) {
  try {
    const rows = await prisma.block.findMany({
      where: { blockerId: req.userId },
      include: { blocked: true },
    });
    res.json(rows.map(function (r) { return userToPublic(r.blocked); }));
  } catch (e) { next(e); }
});

// GET /social/search?q=
router.get('/search', requireAuth, async function (req, res, next) {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const [following, followers, blocked, users] = await Promise.all([
      getFollowing(req.userId),
      getFollowers(req.userId),
      blockedIds(req.userId),
      prisma.user.findMany(),
    ]);

    let pool = users.filter(function (u) { return u.id !== req.userId && !blocked.has(u.id); });
    if (q) {
      pool = pool.filter(function (u) {
        return u.name.toLowerCase().indexOf(q) >= 0 || u.username.toLowerCase().indexOf(q) >= 0;
      });
    }
    res.json(
      pool.slice(0, 30).map(function (u) {
        return Object.assign(userToPublic(u), {
          isFollowing: following.has(u.id),
          mutual: following.has(u.id) && followers.has(u.id),
        });
      })
    );
  } catch (e) { next(e); }
});

// GET /social/following — accounts I follow (with mutual flag)
router.get('/following', requireAuth, async function (req, res, next) {
  try {
    const [following, followers, users] = await Promise.all([
      getFollowing(req.userId),
      getFollowers(req.userId),
      prisma.user.findMany(),
    ]);
    const rows = users
      .filter(function (u) { return following.has(u.id); })
      .map(function (u) {
        return Object.assign(userToPublic(u), { isFollowing: true, mutual: followers.has(u.id) });
      });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /social/counts/:id — followers / following totals
router.get('/counts/:id', requireAuth, async function (req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const [followers, following] = await Promise.all([getFollowers(id), getFollowing(id)]);
    res.json({ followers: followers.size, following: following.size });
  } catch (e) { next(e); }
});

// Decorate a user with the VIEWER's relation (so list rows show follow state).
function decorate(viewerFollowing, viewerFollowers, viewerId, u) {
  return Object.assign(userToPublic(u), {
    isFollowing: viewerFollowing.has(u.id),
    mutual: viewerFollowing.has(u.id) && viewerFollowers.has(u.id),
    isSelf: u.id === viewerId,
  });
}

// GET /social/followers/:id — accounts that follow :id
router.get('/followers/:id', requireAuth, async function (req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const [ids, viewerFollowing, viewerFollowers, users] = await Promise.all([
      getFollowers(id),
      getFollowing(req.userId),
      getFollowers(req.userId),
      prisma.user.findMany(),
    ]);
    res.json(
      users
        .filter(function (u) { return ids.has(u.id); })
        .map(function (u) { return decorate(viewerFollowing, viewerFollowers, req.userId, u); })
    );
  } catch (e) { next(e); }
});

// GET /social/following/:id — accounts that :id follows
router.get('/following/:id', requireAuth, async function (req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const [ids, viewerFollowing, viewerFollowers, users] = await Promise.all([
      getFollowing(id),
      getFollowing(req.userId),
      getFollowers(req.userId),
      prisma.user.findMany(),
    ]);
    res.json(
      users
        .filter(function (u) { return ids.has(u.id); })
        .map(function (u) { return decorate(viewerFollowing, viewerFollowers, req.userId, u); })
    );
  } catch (e) { next(e); }
});

module.exports = router;
