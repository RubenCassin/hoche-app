// Follow-graph helpers (Prisma). "Friends" = mutual follow (A→B and B→A).
const { prisma } = require('./db/prisma');

async function getFollowing(userId) {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  return new Set(rows.map((r) => r.followingId));
}

async function getFollowers(userId) {
  const rows = await prisma.follow.findMany({
    where: { followingId: userId },
    select: { followerId: true },
  });
  return new Set(rows.map((r) => r.followerId));
}

async function getMutuals(userId) {
  const [following, followers] = await Promise.all([getFollowing(userId), getFollowers(userId)]);
  const set = new Set();
  following.forEach((id) => { if (followers.has(id)) set.add(id); });
  return set;
}

async function isFollowing(followerId, followingId) {
  const row = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  return !!row;
}

/** Ids bloqués « avec » userId, dans les deux sens (je bloque / on me bloque). */
async function blockedIds(userId) {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
  });
  const set = new Set();
  rows.forEach((r) => set.add(r.blockerId === userId ? r.blockedId : r.blockerId));
  return set;
}

module.exports = { getFollowing, getFollowers, getMutuals, isFollowing, blockedIds };
