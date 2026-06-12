// Mirror of constants/badges.ts (ids must match the client). Used to award
// "badge unlocked" notifications when a player's stats cross a threshold.

const BADGES = [
  { id: 'first_game', name: 'Première', test: function (s) { return s.matches_played >= 1; } },
  { id: 'regular', name: 'Habitué', test: function (s) { return s.matches_played >= 10; } },
  { id: 'veteran', name: 'Vétéran', test: function (s) { return s.matches_played >= 50; } },
  { id: 'centurion', name: 'Centurion', test: function (s) { return s.matches_played >= 100; } },
  { id: 'maximum', name: 'Maximum', test: function (s) { return s.total_180s >= 1; } },
  { id: 'ton_machine', name: 'Machine à 180', test: function (s) { return s.total_180s >= 10; } },
  { id: 'big_checkout', name: 'Gros checkout', test: function (s) { return s.highest_checkout >= 100; } },
  { id: 'big_fish', name: 'The Big Fish', test: function (s) { return s.highest_checkout >= 170; } },
  { id: 'finisher', name: 'Finisseur', test: function (s) { return s.checkout_attempts >= 10 && s.checkout_pct >= 40; } },
  { id: 'avg60', name: 'Tir groupé', test: function (s) { return s.best_game_avg >= 60; } },
  { id: 'avg80', name: 'Niveau pro', test: function (s) { return s.best_game_avg >= 80; } },
  { id: 'avg100', name: 'Légende', test: function (s) { return s.best_game_avg >= 100; } },
  { id: 'winner', name: 'Gagnant', test: function (s) { return s.matches_won >= 10; } },
  { id: 'streak3', name: 'En feu', test: function (s) { return s.best_win_streak >= 3; } },
  { id: 'streak5', name: 'Invincible', test: function (s) { return s.best_win_streak >= 5; } },
  { id: 'doubles', name: 'Maître des doubles', test: function (s) { return s.doubles_hit >= 50; } },
];

function computeBadges(stats) {
  return BADGES.filter(function (b) { return b.test(stats); }).map(function (b) { return b.id; });
}

function badgeName(id) {
  const b = BADGES.find(function (x) { return x.id === id; });
  return b ? b.name : id;
}

module.exports = { BADGES, computeBadges, badgeName };
