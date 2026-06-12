const express = require('express');
const router = express.Router();
const { prisma } = require('../db/prisma');
const { requireAuth } = require('../auth');
const { getMutuals } = require('../relations');
const { getOnlineUserIds, getLiveMatches } = require('../realtime');

// GET /live/matches — matches in progress right now (for spectating).
router.get('/matches', requireAuth, function (req, res) {
  res.json(getLiveMatches());
});

// GET /live/friends-online — your mutuals who currently hold a live socket.
router.get('/friends-online', requireAuth, async function (req, res, next) {
  try {
    const online = new Set(getOnlineUserIds());
    const mutuals = await getMutuals(req.userId);
    const ids = [...mutuals].filter(function (id) { return id !== req.userId && online.has(id); });
    if (ids.length === 0) return res.json([]);

    const users = await prisma.user.findMany({ where: { id: { in: ids } } });
    res.json(users.map(function (u) {
      return { id: u.id, name: u.name, username: u.username, countryCode: u.countryCode || null };
    }));
  } catch (e) { next(e); }
});

module.exports = router;
