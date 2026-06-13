const express = require('express');
const router = express.Router();
const { prisma, jstr } = require('../db/prisma');
const { requireAuth } = require('../auth');
const { seedBracket, tournamentState } = require('../tournament');

const FINISHES = ['simple', 'double', 'master'];

async function isMember(conversationId, userId) {
  if (!conversationId) return true;
  const row = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return !!row;
}

// Annonce dans le chat du groupe (carte cliquable kind 'tournament').
async function announce(conversationId, senderId, text, tournamentId) {
  if (!conversationId) return;
  try {
    const msg = await prisma.chatMessage.create({
      data: { conversationId, senderId, text, kind: 'tournament', meta: jstr({ tournamentId }) },
      include: { sender: true },
    });
    const { pushToUsers } = require('../realtime');
    const members = await prisma.conversationMember.findMany({ where: { conversationId }, select: { userId: true } });
    pushToUsers(members.map((m) => m.userId), {
      type: 'chat_message',
      conversationId,
      message: {
        id: msg.id, conversationId, senderId, senderName: msg.sender.name,
        text, kind: 'tournament', meta: { tournamentId }, created_at: msg.createdAt.toISOString(),
      },
      isGroup: true,
    });
  } catch (e) { /* best-effort */ }
}

// POST /tournaments { conversationId?, name, startScore, legsToWin, finishMode }
router.post('/', requireAuth, async function (req, res, next) {
  try {
    const conversationId = req.body.conversationId ? parseInt(req.body.conversationId, 10) : null;
    if (conversationId && !(await isMember(conversationId, req.userId))) {
      return res.status(403).json({ error: 'Groupe non accessible' });
    }
    const name = String(req.body.name || '').trim().slice(0, 60) || 'Tournoi';
    const startScore = [301, 501, 701].indexOf(req.body.startScore) >= 0 ? req.body.startScore : 501;
    const legsToWin = [1, 3, 5].indexOf(req.body.legsToWin) >= 0 ? req.body.legsToWin : 1;
    const finishMode = FINISHES.indexOf(req.body.finishMode) >= 0 ? req.body.finishMode : 'double';

    const t = await prisma.tournament.create({
      data: {
        conversationId, name, createdById: req.userId, status: 'lobby',
        startScore, legsToWin, finishMode,
        players: { create: [{ userId: req.userId, seed: 0 }] },
      },
    });
    await announce(conversationId, req.userId, `🏆 Tournoi « ${name} » créé — rejoignez !`, t.id);
    res.status(201).json(await tournamentState(t.id));
  } catch (e) { next(e); }
});

// POST /tournaments/:id/join
router.post('/:id/join', requireAuth, async function (req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const t = await prisma.tournament.findUnique({ where: { id } });
    if (!t) return res.status(404).json({ error: 'Tournoi introuvable' });
    if (t.status !== 'lobby') return res.status(409).json({ error: 'Le tournoi a déjà démarré' });
    if (!(await isMember(t.conversationId, req.userId))) return res.status(403).json({ error: 'Réservé au groupe' });

    const count = await prisma.tournamentPlayer.count({ where: { tournamentId: id } });
    if (count >= 16) return res.status(409).json({ error: 'Tournoi complet (16 max)' });
    await prisma.tournamentPlayer.upsert({
      where: { tournamentId_userId: { tournamentId: id, userId: req.userId } },
      create: { tournamentId: id, userId: req.userId, seed: count },
      update: {},
    });
    const { pushToUsers } = require('../realtime');
    const players = await prisma.tournamentPlayer.findMany({ where: { tournamentId: id }, select: { userId: true } });
    pushToUsers(players.map((p) => p.userId), { type: 'tournament_update', tournamentId: id });
    res.json(await tournamentState(id));
  } catch (e) { next(e); }
});

// POST /tournaments/:id/start  (créateur uniquement)
router.post('/:id/start', requireAuth, async function (req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const t = await prisma.tournament.findUnique({ where: { id } });
    if (!t) return res.status(404).json({ error: 'Tournoi introuvable' });
    if (t.createdById !== req.userId) return res.status(403).json({ error: 'Seul le créateur peut lancer' });
    if (t.status !== 'lobby') return res.status(409).json({ error: 'Déjà démarré' });
    const count = await prisma.tournamentPlayer.count({ where: { tournamentId: id } });
    if (count < 2) return res.status(400).json({ error: 'Au moins 2 joueurs' });

    await prisma.tournament.update({ where: { id }, data: { status: 'running' } });
    await seedBracket(id);
    const { pushToUsers } = require('../realtime');
    const players = await prisma.tournamentPlayer.findMany({ where: { tournamentId: id }, select: { userId: true } });
    pushToUsers(players.map((p) => p.userId), { type: 'tournament_update', tournamentId: id });
    res.json(await tournamentState(id));
  } catch (e) { next(e); }
});

// GET /tournaments/:id — état complet (bracket).
router.get('/:id', requireAuth, async function (req, res, next) {
  try {
    const state = await tournamentState(parseInt(req.params.id, 10));
    if (!state) return res.status(404).json({ error: 'Tournoi introuvable' });
    res.json(state);
  } catch (e) { next(e); }
});

module.exports = router;
