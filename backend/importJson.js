// Import de l'ancienne base JSON (oche-db.json ou une sauvegarde) vers SQLite/
// Prisma, en préservant ids et dates — zéro perte. Idempotent par écrasement :
// refuse de tourner si la base SQLite contient déjà des users, sauf --force
// (qui vide alors toutes les tables avant d'importer).
// Run :  node backend/importJson.js [chemin-du-json] [--force]
const fs = require('fs');
const path = require('path');
const { prisma, jstr } = require('./db/prisma');

const args = process.argv.slice(2).filter((a) => a !== '--force');
const force = process.argv.includes('--force');
const SRC = path.resolve(args[0] || path.join(__dirname, 'db', 'oche-db.json'));

async function main() {
  const db = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  console.log('Source :', SRC);

  const existing = await prisma.user.count();
  if (existing > 0) {
    if (!force) {
      console.error(`La base SQLite contient déjà ${existing} user(s). Relance avec --force pour la vider et réimporter.`);
      process.exit(1);
    }
    await prisma.$transaction([
      prisma.eloPoint.deleteMany(), prisma.block.deleteMany(),
      prisma.notification.deleteMany(), prisma.challenge.deleteMany(),
      prisma.comment.deleteMany(), prisma.post.deleteMany(),
      prisma.follow.deleteMany(), prisma.game.deleteMany(),
      prisma.user.deleteMany(),
    ]);
    console.log('Base SQLite vidée (--force).');
  }

  const date = (s) => (s ? new Date(s) : new Date());

  await prisma.user.createMany({
    data: (db.users || []).map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      passwordHash: u.passwordHash,
      createdAt: date(u.created_at),
      country: u.country || null,
      countryCode: u.countryCode || null,
      region: u.region || null,
      city: u.city || null,
      avatarUrl: u.avatarUrl || null,
      elo: typeof u.elo === 'number' ? u.elo : 1000,
      eloGames: u.eloGames || 0,
      flags: u.flags || 0,
      demo: !!u.demo,
      pushTokens: jstr(u.pushTokens, []),
      badges: jstr(u.badges, []),
    })),
  });

  await prisma.game.createMany({
    data: (db.games || []).map((g) => ({
      id: g.id,
      userId: g.user_id,
      gameType: g.gameType || 'x01',
      matchWon: !!g.matchWon,
      legsWon: g.legsWon || 0,
      legsPlayed: g.legsPlayed || 0,
      opponents: jstr(g.opponents, []),
      opponentIds: jstr(g.opponentIds, []),
      dartsThrown: g.dartsThrown || 0,
      avg: g.avg || 0,
      total180s: g.total180s || 0,
      highestCheckout: g.highestCheckout || 0,
      score: g.score || 0,
      heatmap: jstr(g.heatmap, {}),
      checkoutAttempts: g.checkoutAttempts || 0,
      checkoutHits: g.checkoutHits || 0,
      doublesHit: g.doublesHit || 0,
      first9Points: g.first9Points || 0,
      first9Darts: g.first9Darts || 0,
      startScore: g.startScore || 0,
      visits: jstr(g.visits, []),
      online: !!g.online,
      suspect: !!g.suspect,
      reported: !!g.reported,
      confirmed: !!g.confirmed,
      confirmedBy: jstr(g.confirmedBy, []),
      demo: !!g.demo,
      finishedAt: date(g.finished_at),
    })),
  });

  // Les follows historiques peuvent contenir des doublons → dédup par paire.
  const seen = new Set();
  const follows = (db.follows || []).filter((f) => {
    const k = f.follower_id + ':' + f.following_id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  await prisma.follow.createMany({
    data: follows.map((f) => ({
      followerId: f.follower_id,
      followingId: f.following_id,
      createdAt: date(f.created_at),
    })),
  });

  await prisma.post.createMany({
    data: (db.posts || []).map((p) => ({
      id: p.id,
      userId: p.user_id,
      text: p.text || '',
      likes: jstr(p.likes, []),
      createdAt: date(p.created_at),
    })),
  });

  await prisma.comment.createMany({
    data: (db.comments || []).map((c) => ({
      id: c.id,
      postId: c.post_id,
      userId: c.user_id,
      text: c.text || '',
      createdAt: date(c.created_at),
    })),
  });

  await prisma.challenge.createMany({
    data: (db.challenges || []).map((c) => ({
      id: c.id,
      fromId: c.from_id,
      toId: c.to_id,
      gameType: c.gameType || 'x01',
      legsToWin: c.legsToWin || 1,
      message: c.message || '',
      status: c.status || 'pending',
      createdAt: date(c.created_at),
    })),
  });

  await prisma.notification.createMany({
    data: (db.notifications || []).map((n) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      actorId: n.actor_id || null,
      postId: n.post_id || null,
      gameId: n.game_id || null,
      challengeId: n.challenge_id || null,
      badge: n.badge || null,
      read: !!n.read,
      createdAt: date(n.created_at),
    })),
  });

  const counts = {
    users: await prisma.user.count(),
    games: await prisma.game.count(),
    follows: await prisma.follow.count(),
    posts: await prisma.post.count(),
    comments: await prisma.comment.count(),
    challenges: await prisma.challenge.count(),
    notifications: await prisma.notification.count(),
  };
  console.log('Import terminé :', JSON.stringify(counts));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
