const { prisma } = require('./db/prisma');
const { sendPush } = require('./push');
const { badgeName } = require('./badges');

// Push copy per notification type (recipient's POV). `opts` carries extra data.
const PUSH_BODY = {
  follow: function (actor) { return actor + " s'est abonné à toi"; },
  like: function (actor) { return actor + ' a aimé ton post'; },
  comment: function (actor) { return actor + ' a commenté ton post'; },
  match: function (actor) { return actor + " t'a enregistré un match — à confirmer"; },
  challenge: function (actor) { return actor + ' te lance un défi !'; },
  challenge_result: function (actor) { return actor + ' a répondu à ton défi'; },
  badge: function (_actor, opts) { return 'Badge débloqué : ' + badgeName(opts.badge); },
};

// Create a notification for `recipientId` about `actorId`'s action + best-effort push.
// No-op when actor === recipient, EXCEPT for self-notifications like 'badge'.
async function addNotification(recipientId, type, actorId, opts) {
  if (!recipientId) return;
  if (recipientId === actorId && type !== 'badge') return;
  opts = opts || {};

  await prisma.notification.create({
    data: {
      userId: recipientId,
      type: type,
      actorId: actorId || null,
      postId: opts.postId || null,
      gameId: opts.gameId || null,
      challengeId: opts.challengeId || null,
      badge: opts.badge || null,
    },
  });

  const make = PUSH_BODY[type];
  if (make) {
    const actor = actorId ? await prisma.user.findUnique({ where: { id: actorId } }) : null;
    const actorName = actor ? actor.name : 'Quelqu’un';
    // Best-effort, pas de await bloquant pour la réponse HTTP.
    sendPush(recipientId, {
      title: 'HOCHE',
      body: make(actorName, opts),
      data: { type: type, gameId: opts.gameId || null, postId: opts.postId || null, challengeId: opts.challengeId || null, badge: opts.badge || null },
    });
  }
}

module.exports = { addNotification };
