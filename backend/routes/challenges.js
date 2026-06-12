const express = require('express');
const router = express.Router();
const { prisma } = require('../db/prisma');
const { requireAuth } = require('../auth');
const { addNotification } = require('../notify');
const { blockedIds } = require('../relations');

const GAME_TYPES = ['x01', 'cricket', 'atc', 'killer', 'shanghai'];

// POST /challenges { toUserId, gameType, legsToWin, message } — challenge a friend.
router.post('/', requireAuth, async function (req, res, next) {
  try {
    const toId = parseInt(req.body.toUserId, 10);
    if (!toId || toId === req.userId) return res.status(400).json({ error: 'Destinataire invalide' });
    const target = await prisma.user.findUnique({ where: { id: toId } });
    if (!target) return res.status(404).json({ error: 'Joueur introuvable' });

    const blocked = await blockedIds(req.userId);
    if (blocked.has(toId)) return res.status(403).json({ error: 'Ce joueur est bloqué' });

    const challenge = await prisma.challenge.create({
      data: {
        fromId: req.userId,
        toId: toId,
        gameType: GAME_TYPES.indexOf(req.body.gameType) >= 0 ? req.body.gameType : 'x01',
        legsToWin: Math.max(1, Math.min(7, parseInt(req.body.legsToWin, 10) || 1)),
        message: String(req.body.message || '').trim().slice(0, 140),
        status: 'pending', // 'pending' | 'accepted' | 'declined'
      },
    });
    await addNotification(toId, 'challenge', req.userId, { challengeId: challenge.id });
    res.status(201).json({
      id: challenge.id,
      from_id: challenge.fromId,
      to_id: challenge.toId,
      gameType: challenge.gameType,
      legsToWin: challenge.legsToWin,
      message: challenge.message,
      status: challenge.status,
      created_at: challenge.createdAt.toISOString(),
    });
  } catch (e) { next(e); }
});

async function respond(req, res, next, status) {
  try {
    const ch = await prisma.challenge.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!ch) return res.status(404).json({ error: 'Défi introuvable' });
    if (ch.toId !== req.userId) return res.status(403).json({ error: 'Ce défi ne t’est pas adressé' });
    if (ch.status !== 'pending') return res.status(409).json({ error: 'Défi déjà traité' });

    await prisma.challenge.update({ where: { id: ch.id }, data: { status } });
    // Mark the original challenge notification read for the recipient.
    await prisma.notification.updateMany({
      where: { challengeId: ch.id, userId: req.userId },
      data: { read: true },
    });
    // Tell the challenger the outcome.
    await addNotification(ch.fromId, 'challenge_result', req.userId, { challengeId: ch.id });
    res.json({ status });
  } catch (e) { next(e); }
}

router.post('/:id/accept', requireAuth, function (req, res, next) { respond(req, res, next, 'accepted'); });
router.post('/:id/decline', requireAuth, function (req, res, next) { respond(req, res, next, 'declined'); });

// GET /challenges — mine (sent + received), newest first, enriched with names.
router.get('/', requireAuth, async function (req, res, next) {
  try {
    const rows = await prisma.challenge.findMany({
      where: { OR: [{ fromId: req.userId }, { toId: req.userId }] },
      orderBy: { createdAt: 'desc' },
      include: { from: true, to: true },
    });
    res.json(
      rows.map(function (c) {
        const incoming = c.toId === req.userId;
        const opp = incoming ? c.from : c.to;
        return {
          id: c.id,
          gameType: c.gameType,
          legsToWin: c.legsToWin,
          message: c.message,
          status: c.status,
          incoming: incoming,
          opponentId: incoming ? c.fromId : c.toId,
          opponentName: opp ? opp.name : 'Joueur',
          created_at: c.createdAt.toISOString(),
        };
      })
    );
  } catch (e) { next(e); }
});

module.exports = router;
