const express = require('express');
const router = express.Router();
const { prisma, gameToApi, jarr } = require('../db/prisma');
const { requireAuth } = require('../auth');
const { getFollowing, getMutuals, blockedIds } = require('../relations');

// GET /feed?scope=foryou|friends (auth) — merged timeline:
//   • friends: posts from people you follow (+ you) + matches from mutuals (+ you)
//   • foryou:  everyone's posts + everyone's *notable* matches (discovery)
// Les joueurs bloqués (dans un sens ou l'autre) sont absents des deux flux.
router.get('/', requireAuth, async function (req, res, next) {
  try {
    const me = req.userId;
    const scope = req.query.scope === 'friends' ? 'friends' : 'foryou';

    const [users, following, mutuals, blocked, posts, games] = await Promise.all([
      prisma.user.findMany(),
      getFollowing(me),
      getMutuals(me),
      blockedIds(me),
      prisma.post.findMany({ include: { _count: { select: { comments: true } } } }),
      prisma.game.findMany({ where: { confirmed: true } }),
    ]);
    const byId = {};
    users.forEach(function (u) { byId[u.id] = u; });

    // A match is "notable" if it's a win, has a 180, or a 100+ checkout.
    const notable = function (g) {
      return g.matchWon || g.total180s > 0 || g.highestCheckout >= 100;
    };

    // Only real, opponent-confirmed user-vs-user matches reach the feed.
    const isPvP = function (g) {
      return Array.isArray(g.opponentIds) && g.opponentIds.length > 0 && g.confirmed === true;
    };

    const canSeePosts =
      scope === 'friends'
        ? function (uid) { return uid === me || following.has(uid); }
        : function () { return true; };
    const canSeeMatches =
      scope === 'friends'
        ? function (g) { return isPvP(g) && (g.user_id === me || mutuals.has(g.user_id)); }
        : function (g) { return isPvP(g) && notable(g); };

    const postItems = posts
      .filter(function (p) { return !blocked.has(p.userId) && canSeePosts(p.userId); })
      .map(function (p) {
        const a = byId[p.userId];
        const likes = jarr(p.likes);
        return {
          kind: 'post',
          id: 'post-' + p.id,
          user_id: p.userId,
          userName: a ? a.name : 'Joueur',
          username: a ? a.username : '',
          text: p.text,
          likeCount: likes.length,
          liked: likes.indexOf(me) >= 0,
          commentCount: p._count.comments,
          postId: p.id,
          created_at: p.createdAt.toISOString(),
        };
      });

    const matchItems = games
      .map(gameToApi)
      .filter(function (g) { return !blocked.has(g.user_id) && canSeeMatches(g); })
      .map(function (g) {
        const a = byId[g.user_id];
        return {
          kind: 'match',
          id: 'match-' + g.id,
          user_id: g.user_id,
          userName: a ? a.name : 'Joueur',
          username: a ? a.username : '',
          gameType: g.gameType,
          matchWon: g.matchWon,
          legsWon: g.legsWon,
          oppLegs: Math.max(0, g.legsPlayed - g.legsWon),
          opponents: g.opponents || [],
          total180s: g.total180s,
          highestCheckout: g.highestCheckout,
          score: g.score,
          created_at: g.finished_at,
        };
      });

    let items = postItems.concat(matchItems);

    if (scope === 'foryou') {
      // Relevance score = engagement × recency decay. Posts rank on likes/comments,
      // matches on how flashy they were; everything fades over ~half a day.
      const now = Date.now();
      const rank = function (it) {
        const ageH = Math.max(0, (now - new Date(it.created_at).getTime()) / 3_600_000);
        const recency = 1 / (1 + ageH / 12);
        let engagement;
        if (it.kind === 'post') {
          engagement = 1 + it.likeCount * 2 + it.commentCount * 3;
        } else {
          engagement =
            1 +
            (it.matchWon ? 2 : 0) +
            it.total180s * 5 +
            (it.highestCheckout >= 100 ? 3 : 0);
        }
        return engagement * recency;
      };
      items = items
        .map(function (it) { return { it: it, s: rank(it) }; })
        .sort(function (a, b) {
          if (b.s !== a.s) return b.s - a.s;
          return b.it.created_at.localeCompare(a.it.created_at);
        })
        .map(function (x) { return x.it; });
    } else {
      items.sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
    }

    res.json(items.slice(0, 60));
  } catch (e) { next(e); }
});

module.exports = router;
