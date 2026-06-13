// ─── Tournoi online : bracket à élimination directe ──────────────────────────
// Modèle Tournament/TournamentPlayer/TournamentMatch (Prisma). Le bracket est
// monté au démarrage (byes si le nombre de joueurs n'est pas une puissance de 2),
// puis chaque match gagné fait avancer le vainqueur via advance(). La fin pose
// un récap (podium) dans le chat du groupe et notifie les participants.
const { prisma, jstr } = require('./db/prisma');

function nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(2, p);
}

/** Monte le bracket pour les joueurs inscrits (ordre = seed). Idempotent-safe :
 *  à n'appeler qu'au démarrage (status lobby → running). */
async function seedBracket(tournamentId) {
  const players = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    orderBy: { seed: 'asc' },
  });
  const n = players.length;
  if (n < 2) throw new Error('Au moins 2 joueurs');

  const size = nextPow2(n);
  const rounds = Math.log2(size);
  const matches0 = size / 2;

  // Crée tous les matchs vides de tous les tours.
  for (let r = 0; r < rounds; r++) {
    const count = size / Math.pow(2, r + 1);
    for (let s = 0; s < count; s++) {
      await prisma.tournamentMatch.create({
        data: { tournamentId, round: r, slot: s, status: 'pending' },
      });
    }
  }

  // Remplit le 1er tour : un player1 par match d'abord, puis les player2.
  // Garantit qu'aucun match n'a deux byes ; les byes sont les derniers matchs.
  const round0 = await prisma.tournamentMatch.findMany({
    where: { tournamentId, round: 0 },
    orderBy: { slot: 'asc' },
  });
  for (let i = 0; i < n; i++) {
    const uid = players[i].userId;
    if (i < matches0) {
      await prisma.tournamentMatch.update({ where: { id: round0[i].id }, data: { player1Id: uid } });
    } else {
      await prisma.tournamentMatch.update({ where: { id: round0[i - matches0].id }, data: { player2Id: uid } });
    }
  }

  // Statut des matchs du 1er tour : ready si 2 joueurs, bye si un seul.
  const fresh = await prisma.tournamentMatch.findMany({ where: { tournamentId, round: 0 }, orderBy: { slot: 'asc' } });
  for (const m of fresh) {
    if (m.player1Id && m.player2Id) {
      await prisma.tournamentMatch.update({ where: { id: m.id }, data: { status: 'ready' } });
    } else if (m.player1Id && !m.player2Id) {
      // Bye : player1 passe au tour suivant tout de suite.
      await advance(m.id, m.player1Id, { silent: true });
    }
  }
}

/** Le vainqueur d'un match passe au tour suivant ; gère la fin du tournoi. */
async function advance(matchId, winnerId, opts) {
  opts = opts || {};
  const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  if (!match || match.status === 'done') return;
  if (winnerId !== match.player1Id && winnerId !== match.player2Id && match.player2Id) return;

  await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: { winnerId, status: 'done' },
  });

  const t = await prisma.tournament.findUnique({ where: { id: match.tournamentId } });
  const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;

  // Place du perdant = nombre de joueurs encore en lice après ce tour (approx).
  if (loserId) {
    const survivors = Math.pow(2, await roundsLeft(match.tournamentId, match.round));
    await prisma.tournamentPlayer.update({
      where: { tournamentId_userId: { tournamentId: match.tournamentId, userId: loserId } },
      data: { place: survivors + 1 },
    }).catch(() => {});
  }

  const totalRounds = await prisma.tournamentMatch.findMany({
    where: { tournamentId: match.tournamentId },
    select: { round: true },
    orderBy: { round: 'desc' },
    take: 1,
  });
  const lastRound = totalRounds.length ? totalRounds[0].round : match.round;

  if (match.round >= lastRound) {
    // Finale : on a un champion.
    await prisma.tournament.update({ where: { id: match.tournamentId }, data: { status: 'done', winnerId } });
    await prisma.tournamentPlayer.update({
      where: { tournamentId_userId: { tournamentId: match.tournamentId, userId: winnerId } },
      data: { place: 1 },
    }).catch(() => {});
    if (!opts.silent) await onFinished(match.tournamentId);
    return;
  }

  // Pousse le vainqueur dans le match parent du tour suivant.
  const parentSlot = Math.floor(match.slot / 2);
  const parent = await prisma.tournamentMatch.findFirst({
    where: { tournamentId: match.tournamentId, round: match.round + 1, slot: parentSlot },
  });
  if (parent) {
    const side = match.slot % 2 === 0 ? 'player1Id' : 'player2Id';
    const data = { [side]: winnerId };
    const updated = await prisma.tournamentMatch.update({ where: { id: parent.id }, data });
    if (updated.player1Id && updated.player2Id) {
      await prisma.tournamentMatch.update({ where: { id: parent.id }, data: { status: 'ready' } });
    }
  }
  if (!opts.silent) await notifyUpdate(match.tournamentId);
}

async function roundsLeft(tournamentId, round) {
  const last = await prisma.tournamentMatch.findFirst({
    where: { tournamentId }, orderBy: { round: 'desc' }, select: { round: true },
  });
  return (last ? last.round : round) - round; // tours restants après celui-ci
}

/** Notifie les participants en ligne d'un changement (WS). Lazy-require pour
 *  éviter une dépendance circulaire avec realtime.js. */
async function notifyUpdate(tournamentId) {
  try {
    const { pushToUsers } = require('./realtime');
    const players = await prisma.tournamentPlayer.findMany({ where: { tournamentId }, select: { userId: true } });
    pushToUsers(players.map((p) => p.userId), { type: 'tournament_update', tournamentId });
  } catch (e) { /* best-effort */ }
}

/** Fin du tournoi : récap (podium) posté dans le chat du groupe + notif. */
async function onFinished(tournamentId) {
  await notifyUpdate(tournamentId);
  try {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t || !t.conversationId) return;
    const winner = t.winnerId ? await prisma.user.findUnique({ where: { id: t.winnerId } }) : null;
    const text = `🏆 Tournoi « ${t.name} » terminé — vainqueur : ${winner ? winner.name : '?'} !`;
    const msg = await prisma.chatMessage.create({
      data: {
        conversationId: t.conversationId,
        senderId: t.createdById,
        text,
        kind: 'tournament',
        meta: jstr({ tournamentId }),
      },
      include: { sender: true },
    });
    const members = await prisma.conversationMember.findMany({
      where: { conversationId: t.conversationId }, select: { userId: true },
    });
    const { pushToUsers } = require('./realtime');
    pushToUsers(members.map((m) => m.userId), {
      type: 'chat_message',
      conversationId: t.conversationId,
      message: {
        id: msg.id, conversationId: t.conversationId, senderId: t.createdById,
        senderName: msg.sender.name, text, kind: 'tournament', meta: { tournamentId },
        created_at: msg.createdAt.toISOString(),
      },
      isGroup: true,
    });
  } catch (e) { /* best-effort */ }
}

/** État complet pour le client (joueurs + matchs groupés par tour). */
async function tournamentState(tournamentId) {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!t) return null;
  const [players, matches] = await Promise.all([
    prisma.tournamentPlayer.findMany({ where: { tournamentId }, orderBy: { seed: 'asc' } }),
    prisma.tournamentMatch.findMany({ where: { tournamentId }, orderBy: [{ round: 'asc' }, { slot: 'asc' }] }),
  ]);
  const ids = [...new Set(players.map((p) => p.userId))];
  const users = await prisma.user.findMany({ where: { id: { in: ids } } });
  const nameOf = (id) => { const u = users.find((x) => x.id === id); return u ? u.name : null; };
  return {
    id: t.id,
    conversationId: t.conversationId,
    name: t.name,
    status: t.status,
    createdById: t.createdById,
    config: { startScore: t.startScore, legsToWin: t.legsToWin, finishMode: t.finishMode },
    winnerId: t.winnerId,
    winnerName: t.winnerId ? nameOf(t.winnerId) : null,
    players: players.map((p) => ({ userId: p.userId, name: nameOf(p.userId), seed: p.seed, place: p.place })),
    matches: matches.map((m) => ({
      id: m.id, round: m.round, slot: m.slot,
      player1Id: m.player1Id, player1Name: m.player1Id ? nameOf(m.player1Id) : null,
      player2Id: m.player2Id, player2Name: m.player2Id ? nameOf(m.player2Id) : null,
      winnerId: m.winnerId, roomCode: m.roomCode, status: m.status,
    })),
  };
}

module.exports = { seedBracket, advance, tournamentState, nextPow2 };
