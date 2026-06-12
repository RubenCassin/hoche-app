const express = require('express');
const router = express.Router();
const { prisma, gamesByUser } = require('../db/prisma');
const { requireAuth } = require('../auth');
const { computeStats } = require('../stats');
const { getMutuals } = require('../relations');

// Minimum games to appear on a ranked board (avoids tiny-sample flukes).
const MIN_RANKED_GAMES = 3;

// ISO 3166-1 alpha-2 codes considered "Europe" (EU + wider continent).
const EUROPE = new Set([
  'AL', 'AD', 'AT', 'AX', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK',
  'EE', 'ES', 'FI', 'FO', 'FR', 'GB', 'GE', 'GG', 'GI', 'GR', 'HR', 'HU', 'IE',
  'IM', 'IS', 'IT', 'JE', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT',
  'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'UA', 'VA', 'XK',
]);

// GET /leaderboard?scope=world|europe|country|friends  (auth)
//   world   = everyone ranked          (>= MIN_RANKED_GAMES)
//   europe  = players located in Europe (>= MIN_RANKED_GAMES)
//   country = players in your country   (>= MIN_RANKED_GAMES)
//   friends = your mutuals + you        (>= 1)
router.get('/', requireAuth, async function (req, res, next) {
  try {
    const raw = String(req.query.scope || 'world');
    const scope = ['world', 'europe', 'country', 'friends'].indexOf(raw) >= 0 ? raw : 'world';
    const minGames = scope === 'friends' ? 1 : MIN_RANKED_GAMES;

    const me = await prisma.user.findUnique({ where: { id: req.userId } });
    const myCC = me && me.countryCode ? String(me.countryCode).toUpperCase() : null;

    const users = await prisma.user.findMany();
    let pool;
    if (scope === 'friends') {
      const mutuals = await getMutuals(req.userId);
      mutuals.add(req.userId);
      pool = users.filter(function (u) { return mutuals.has(u.id); });
    } else if (scope === 'europe') {
      pool = users.filter(function (u) { return u.countryCode && EUROPE.has(String(u.countryCode).toUpperCase()); });
    } else if (scope === 'country') {
      // No country set on your account → nothing to compare against.
      pool = myCC ? users.filter(function (u) { return u.countryCode && String(u.countryCode).toUpperCase() === myCC; }) : [];
    } else {
      pool = users;
    }

    const byUser = await gamesByUser();
    const rows = pool
      .map(function (u) {
        const s = computeStats(byUser.get(u.id) || [], u.id);
        return {
          id: u.id,
          name: u.name,
          username: u.username,
          country: u.country || null,
          countryCode: u.countryCode || null,
          matches_played: s.matches_played,
          matches_won: s.matches_won,
          win_pct: s.win_pct,
          three_dart_avg: s.three_dart_avg,
          total_180s: s.total_180s,
          highest_checkout: s.highest_checkout,
          elo: u.elo || 1000,
          elo_games: u.eloGames || 0,
          flags: u.flags || 0,
        };
      })
      .filter(function (r) { return r.matches_played >= minGames; });

    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
