const express = require('express');
const router = express.Router();
const { prisma, userToPublic, jstr, jobj } = require('../db/prisma');
const { requireAuth } = require('../auth');
const { blockedIds } = require('../relations');
const { pushToUsers } = require('../realtime');
const { sendPush } = require('../push');

const MSG_KINDS = ['text', 'match_invite'];

// Forme d'un message pour le client.
function messageToApi(m, sender) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: sender ? sender.name : 'Joueur',
    text: m.text,
    kind: m.kind,
    meta: jobj(m.meta),
    created_at: m.createdAt.toISOString(),
  };
}

// Forme d'une conversation pour `viewerId` : nom/avatar (direct = l'autre),
// dernier message, nombre de non-lus.
function conversationToApi(c, viewerId) {
  const others = c.members.filter((mem) => mem.userId !== viewerId);
  const me = c.members.find((mem) => mem.userId === viewerId);
  const last = c.messages[0] || null;
  let unread = 0;
  if (me) {
    unread = c.messages.filter(
      (msg) => msg.senderId !== viewerId && msg.createdAt > me.lastReadAt
    ).length;
  }
  const display = c.isGroup
    ? { name: c.name || 'Groupe', avatarUrl: null, otherId: null }
    : {
        name: others[0] ? others[0].user.name : 'Joueur',
        avatarUrl: others[0] ? others[0].user.avatarUrl || null : null,
        otherId: others[0] ? others[0].userId : null,
      };
  return {
    id: c.id,
    isGroup: c.isGroup,
    name: display.name,
    avatarUrl: display.avatarUrl,
    otherId: display.otherId,
    members: c.members.map((mem) => userToPublic(mem.user)),
    lastMessage: last
      ? { text: last.text, kind: last.kind, senderId: last.senderId, created_at: last.createdAt.toISOString() }
      : null,
    unread,
    updated_at: (last ? last.createdAt : c.createdAt).toISOString(),
  };
}

const memberInclude = {
  members: { include: { user: true } },
  messages: { orderBy: { createdAt: 'desc' }, take: 30 }, // récents → non-lus + dernier
};

async function loadConversation(id) {
  return prisma.conversation.findUnique({ where: { id }, include: memberInclude });
}
function isMember(conv, userId) {
  return conv && conv.members.some((m) => m.userId === userId);
}

// GET /chat/conversations — mes conversations, plus récentes en premier.
router.get('/conversations', requireAuth, async function (req, res, next) {
  try {
    const convs = await prisma.conversation.findMany({
      where: { members: { some: { userId: req.userId } } },
      include: memberInclude,
    });
    const shaped = convs
      .map((c) => conversationToApi(c, req.userId))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    res.json(shaped);
  } catch (e) { next(e); }
});

// GET /chat/unread — total des messages non lus (pour le badge global).
router.get('/unread', requireAuth, async function (req, res, next) {
  try {
    const members = await prisma.conversationMember.findMany({ where: { userId: req.userId } });
    let total = 0;
    for (const mem of members) {
      total += await prisma.chatMessage.count({
        where: { conversationId: mem.conversationId, senderId: { not: req.userId }, createdAt: { gt: mem.lastReadAt } },
      });
    }
    res.json({ unread: total });
  } catch (e) { next(e); }
});

// POST /chat/conversations — directe { userId } ou groupe { name, memberIds }.
router.post('/conversations', requireAuth, async function (req, res, next) {
  try {
    const isGroup = !!req.body.name || Array.isArray(req.body.memberIds);

    if (!isGroup) {
      const otherId = parseInt(req.body.userId, 10);
      if (!otherId || otherId === req.userId) return res.status(400).json({ error: 'Destinataire invalide' });
      const other = await prisma.user.findUnique({ where: { id: otherId } });
      if (!other) return res.status(404).json({ error: 'Joueur introuvable' });
      const blocked = await blockedIds(req.userId);
      if (blocked.has(otherId)) return res.status(403).json({ error: 'Ce joueur est bloqué' });

      // Réutilise la conversation directe existante si elle existe déjà.
      const existing = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { members: { some: { userId: req.userId } } },
            { members: { some: { userId: otherId } } },
          ],
        },
        include: memberInclude,
      });
      if (existing) return res.json(conversationToApi(existing, req.userId));

      const created = await prisma.conversation.create({
        data: {
          isGroup: false,
          createdById: req.userId,
          members: { create: [{ userId: req.userId }, { userId: otherId }] },
        },
        include: memberInclude,
      });
      return res.status(201).json(conversationToApi(created, req.userId));
    }

    // Groupe : nom + membres (moi inclus d'office).
    const name = String(req.body.name || '').trim().slice(0, 60);
    if (!name) return res.status(400).json({ error: 'Nom du groupe requis' });
    const ids = Array.isArray(req.body.memberIds)
      ? req.body.memberIds.map((n) => parseInt(n, 10)).filter((n) => Number.isInteger(n) && n !== req.userId)
      : [];
    const unique = [...new Set([req.userId, ...ids])].slice(0, 20);
    if (unique.length < 2) return res.status(400).json({ error: 'Ajoute au moins un membre' });

    const created = await prisma.conversation.create({
      data: {
        isGroup: true,
        name,
        createdById: req.userId,
        members: { create: unique.map((userId) => ({ userId })) },
      },
      include: memberInclude,
    });
    res.status(201).json(conversationToApi(created, req.userId));
  } catch (e) { next(e); }
});

// GET /chat/conversations/:id/messages — fil (ancien → récent), 50 derniers.
router.get('/conversations/:id/messages', requireAuth, async function (req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const conv = await loadConversation(id);
    if (!isMember(conv, req.userId)) return res.status(403).json({ error: 'Conversation non accessible' });

    const rows = await prisma.chatMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { sender: true },
    });
    res.json(rows.reverse().map((m) => messageToApi(m, m.sender)));
  } catch (e) { next(e); }
});

// POST /chat/conversations/:id/messages { text, kind?, meta? }
router.post('/conversations/:id/messages', requireAuth, async function (req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const conv = await loadConversation(id);
    if (!isMember(conv, req.userId)) return res.status(403).json({ error: 'Conversation non accessible' });

    const text = String(req.body.text || '').trim().slice(0, 1000);
    const kind = MSG_KINDS.indexOf(req.body.kind) >= 0 ? req.body.kind : 'text';
    if (!text && kind === 'text') return res.status(400).json({ error: 'Message vide' });

    // En direct : pas de message si l'un a bloqué l'autre.
    if (!conv.isGroup) {
      const blocked = await blockedIds(req.userId);
      const other = conv.members.find((m) => m.userId !== req.userId);
      if (other && blocked.has(other.userId)) return res.status(403).json({ error: 'Ce joueur est bloqué' });
    }

    const msg = await prisma.chatMessage.create({
      data: { conversationId: id, senderId: req.userId, text, kind, meta: jstr(req.body.meta || {}) },
      include: { sender: true },
    });
    // L'expéditeur a forcément tout lu jusqu'à son propre message.
    await prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId: req.userId } },
      data: { lastReadAt: new Date() },
    });

    const api = messageToApi(msg, msg.sender);
    const memberIds = conv.members.map((m) => m.userId);
    // Temps réel : relai à tous les membres en ligne (l'expéditeur ignore l'écho).
    pushToUsers(memberIds, { type: 'chat_message', conversationId: id, message: api, isGroup: conv.isGroup, convName: conv.name });

    // Push best-effort aux autres membres (in-app gère le reste).
    const title = conv.isGroup ? conv.name || 'Groupe' : msg.sender.name;
    const body = kind === 'match_invite' ? `${msg.sender.name} lance un match 🎯` : (conv.isGroup ? `${msg.sender.name}: ${text}` : text);
    for (const mid of memberIds) {
      if (mid !== req.userId) sendPush(mid, { title, body, data: { type: 'chat', conversationId: id } });
    }

    res.status(201).json(api);
  } catch (e) { next(e); }
});

// POST /chat/conversations/:id/read — marque la conversation comme lue.
router.post('/conversations/:id/read', requireAuth, async function (req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const conv = await loadConversation(id);
    if (!isMember(conv, req.userId)) return res.status(403).json({ error: 'Conversation non accessible' });
    await prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId: req.userId } },
      data: { lastReadAt: new Date() },
    });
    pushToUsers([req.userId], { type: 'chat_read', conversationId: id }); // sync autres appareils
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /chat/conversations/:id/members { memberIds } — ajoute au groupe.
router.post('/conversations/:id/members', requireAuth, async function (req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const conv = await loadConversation(id);
    if (!isMember(conv, req.userId)) return res.status(403).json({ error: 'Conversation non accessible' });
    if (!conv.isGroup) return res.status(400).json({ error: 'Pas un groupe' });

    const existing = new Set(conv.members.map((m) => m.userId));
    const ids = (Array.isArray(req.body.memberIds) ? req.body.memberIds : [])
      .map((n) => parseInt(n, 10))
      .filter((n) => Number.isInteger(n) && !existing.has(n));
    if (ids.length === 0) return res.status(400).json({ error: 'Aucun membre à ajouter' });

    await prisma.conversationMember.createMany({
      data: ids.map((userId) => ({ conversationId: id, userId })),
    });
    const updated = await loadConversation(id);
    pushToUsers(updated.members.map((m) => m.userId), { type: 'chat_member_added', conversationId: id });
    res.json(conversationToApi(updated, req.userId));
  } catch (e) { next(e); }
});

module.exports = router;
