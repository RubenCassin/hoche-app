const express = require('express');
const router = express.Router();
const { prisma, gamesByUser } = require('../db/prisma');
const { requireAuth } = require('../auth');
const { computeStats } = require('../stats');

// Skill-tier divisions, ranked by career 3-dart average. You climb a division by
// raising your average (implicit promotion/relegation — no manual roster moves).
const DIVISIONS = [
  { key: 'bronze', name: 'Bronze', min: 0 },
  { key: 'argent', name: 'Argent', min: 40 },
  { key: 'or', name: 'Or', min: 55 },
  { key: 'elite', name: 'Élite', min: 70 },
];
function divisionFor(avg) {
  let idx = 0;
  for (let i = DIVISIONS.length - 1; i >= 0; i--) {
    if (avg >= DIVISIONS[i].min) { idx = i; break; }
  }
  return { idx: idx, key: DIVISIONS[idx].key, name: DIVISIONS[idx].name };
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// GET /league  (auth) — standings of YOUR division for the current monthly season.
router.get('/', requireAuth, async function (req, res, next) {
  try {
    const now = new Date();
    const season = now.getUTCFullYear() + '-' + String(now.getUTCMonth() + 1).padStart(2, '0');
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const daysLeft = Math.max(0, Math.ceil((nextStart.getTime() - now.getTime()) / 86400000));

    const byUser = await gamesByUser();
    const users = await prisma.user.findMany();

    const myStats = computeStats(byUser.get(req.userId) || [], req.userId);
    const myDiv = divisionFor(myStats.three_dart_avg);

    // League points this season: per confirmed game finished this month → win = 3, loss = 1.
    function seasonPoints(uid) {
      let pts = 0, played = 0, won = 0;
      (byUser.get(uid) || []).forEach(function (g) {
        if (g.confirmed === false) return;
        const t = new Date(g.finished_at).getTime();
        if (t < start.getTime() || t >= nextStart.getTime()) return;
        played += 1;
        if (g.matchWon) { won += 1; pts += 3; } else { pts += 1; }
      });
      return { pts: pts, played: played, won: won };
    }

    const entries = users
      .map(function (u) {
        const s = computeStats(byUser.get(u.id) || [], u.id);
        return { u: u, avg: s.three_dart_avg, div: divisionFor(s.three_dart_avg) };
      })
      .filter(function (x) { return x.div.idx === myDiv.idx; })
      .map(function (x) {
        const sp = seasonPoints(x.u.id);
        return {
          id: x.u.id,
          name: x.u.name,
          countryCode: x.u.countryCode || null,
          three_dart_avg: x.avg,
          points: sp.pts,
          played: sp.played,
          won: sp.won,
        };
      })
      // Keep the board to active players this season, but always list the requester.
      .filter(function (r) { return r.played > 0 || r.id === req.userId; })
      .sort(function (a, b) {
        if (b.points !== a.points) return b.points - a.points;
        return b.three_dart_avg - a.three_dart_avg;
      });

    const myIndex = entries.findIndex(function (r) { return r.id === req.userId; });
    const mine = myIndex >= 0 ? entries[myIndex] : { points: 0, played: 0, won: 0 };

    res.json({
      season: season,
      seasonLabel: MONTHS[now.getUTCMonth()] + ' ' + now.getUTCFullYear(),
      daysLeft: daysLeft,
      division: { key: myDiv.key, name: myDiv.name, index: myDiv.idx, total: DIVISIONS.length },
      nextDivisionName: myDiv.idx < DIVISIONS.length - 1 ? DIVISIONS[myDiv.idx + 1].name : null,
      avgToPromote: myDiv.idx < DIVISIONS.length - 1 ? DIVISIONS[myDiv.idx + 1].min : null,
      myAvg: myStats.three_dart_avg,
      you: { rank: myIndex >= 0 ? myIndex + 1 : null, points: mine.points, played: mine.played, won: mine.won },
      entries: entries,
    });
  } catch (e) { next(e); }
});

module.exports = router;
