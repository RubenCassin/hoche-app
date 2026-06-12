// Shared per-user stats aggregation, reused by /users/:id/stats and /leaderboard.
// Takes the user's games in API shape (gameToApi) — pure, no DB access.

function computeStats(games, userId) {
  const base = {
    user_id: userId,
    matches_played: 0, matches_won: 0, win_pct: 0,
    legs_played: 0, legs_won: 0,
    three_dart_avg: 0, avg_history: [],
    total_180s: 0, highest_checkout: 0,
    best_game_avg: 0, heatmap: {},
    checkout_pct: 0, checkout_hits: 0, checkout_attempts: 0,
    doubles_hit: 0, first9_avg: 0,
    best_win_streak: 0, current_win_streak: 0,
    most_180s_game: 0, by_game_type: {},
    // Advanced (X01): visit-total bands, highest visit, darts/leg, best leg.
    scores_60: 0, scores_100: 0, scores_140: 0, highest_score: 0,
    darts_per_leg: 0, best_leg: 0,
  };
  if (!games || games.length === 0) return base;

  const chrono = games.slice().sort(function (a, b) {
    return a.finished_at.localeCompare(b.finished_at);
  });

  let matchesWon = 0, legsPlayed = 0, legsWon = 0, total180s = 0, highestCheckout = 0;
  let sumPoints = 0, sumDarts = 0, bestGameAvg = 0;
  let checkoutAttempts = 0, checkoutHits = 0, doublesHit = 0, most180sGame = 0;
  let first9Points = 0, first9Darts = 0;
  let bestStreak = 0, runStreak = 0, currentStreak = 0;
  let scores60 = 0, scores100 = 0, scores140 = 0, highestScore = 0;
  let x01Darts = 0, x01Legs = 0, bestLeg = 0;
  const heatmap = {};
  const byType = {};
  const x01Avgs = [];

  chrono.forEach(function (g) {
    if (g.matchWon) matchesWon += 1;
    legsPlayed += g.legsPlayed;
    legsWon += g.legsWon;
    total180s += g.total180s;
    if (g.total180s > most180sGame) most180sGame = g.total180s;
    if (g.highestCheckout > highestCheckout) highestCheckout = g.highestCheckout;

    checkoutAttempts += g.checkoutAttempts || 0;
    checkoutHits += g.checkoutHits || 0;
    doublesHit += g.doublesHit || 0;
    first9Points += g.first9Points || 0;
    first9Darts += g.first9Darts || 0;

    // Win streaks (chronological): track the longest run and the live one.
    if (g.matchWon) {
      runStreak += 1;
      if (runStreak > bestStreak) bestStreak = runStreak;
      currentStreak += 1;
    } else {
      runStreak = 0;
      currentStreak = 0;
    }

    // Per game-type tally.
    const t = g.gameType || 'x01';
    if (!byType[t]) byType[t] = { played: 0, won: 0 };
    byType[t].played += 1;
    if (g.matchWon) byType[t].won += 1;

    if (g.gameType === 'x01' && g.dartsThrown > 0 && g.avg > 0) {
      sumPoints += (g.avg / 3) * g.dartsThrown;
      sumDarts += g.dartsThrown;
      x01Avgs.push(Math.round(g.avg * 10) / 10);
      if (g.avg > bestGameAvg) bestGameAvg = g.avg;
    }

    // Advanced X01 metrics.
    if (g.gameType === 'x01') {
      x01Darts += g.dartsThrown || 0;
      x01Legs += g.legsPlayed || 0;
      // Best leg = fewest darts to win — only single-leg wins reconstruct reliably.
      if (g.matchWon && g.legsPlayed === 1 && g.dartsThrown > 0) {
        if (bestLeg === 0 || g.dartsThrown < bestLeg) bestLeg = g.dartsThrown;
      }
      // Visit-total bands (180 lives in total_180s).
      (g.visits || []).forEach(function (v) {
        if (v.bust) return;
        if (v.total > highestScore) highestScore = v.total;
        if (v.total >= 180) return; // 180 is tracked separately in total_180s
        if (v.total >= 140) scores140 += 1;
        else if (v.total >= 100) scores100 += 1;
        else if (v.total >= 60) scores60 += 1;
      });
    }

    Object.keys(g.heatmap || {}).forEach(function (seg) {
      heatmap[seg] = (heatmap[seg] || 0) + g.heatmap[seg];
    });
  });

  return {
    user_id: userId,
    matches_played: games.length,
    matches_won: matchesWon,
    win_pct: Math.round((matchesWon / games.length) * 1000) / 10,
    legs_played: legsPlayed,
    legs_won: legsWon,
    three_dart_avg: sumDarts > 0 ? Math.round((3 * sumPoints / sumDarts) * 10) / 10 : 0,
    avg_history: x01Avgs.slice(-30),
    total_180s: total180s,
    highest_checkout: highestCheckout,
    best_game_avg: Math.round(bestGameAvg * 10) / 10,
    heatmap: heatmap,
    checkout_pct: checkoutAttempts > 0 ? Math.round((checkoutHits / checkoutAttempts) * 1000) / 10 : 0,
    checkout_hits: checkoutHits,
    checkout_attempts: checkoutAttempts,
    doubles_hit: doublesHit,
    first9_avg: first9Darts > 0 ? Math.round(((3 * first9Points) / first9Darts) * 10) / 10 : 0,
    best_win_streak: bestStreak,
    current_win_streak: currentStreak,
    most_180s_game: most180sGame,
    by_game_type: byType,
    scores_60: scores60,
    scores_100: scores100,
    scores_140: scores140,
    highest_score: highestScore,
    darts_per_leg: x01Legs > 0 ? Math.round((x01Darts / x01Legs) * 10) / 10 : 0,
    best_leg: bestLeg,
  };
}

module.exports = { computeStats };
