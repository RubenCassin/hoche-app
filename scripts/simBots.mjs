// Calibration des bots X01 — simule des legs de 501 double-out par niveau.
// Usage : npx esbuild hooks/botEngine.ts --bundle --format=esm --outfile=scripts/.botEngine.bundle.mjs && node scripts/simBots.mjs
import { x01BotVisit, BOT_ORDER } from './.botEngine.bundle.mjs';

const LEGS = 4000;

console.log('niveau      | moy/volée | volées/leg | busts/leg | meilleur leg (volées)');
console.log('------------|-----------|------------|-----------|----------------------');
for (const tier of BOT_ORDER) {
  let totalVisits = 0;
  let totalBusts = 0;
  const legVisits = [];
  for (let l = 0; l < LEGS; l++) {
    let rem = 501;
    let visits = 0;
    for (;;) {
      const t = x01BotVisit(rem, tier, true);
      visits += 1;
      if (visits > 2000) throw new Error(`leg sans fin (${tier}, rem=${rem})`);
      if (t === rem) break; // checkout
      if (t === 0 && rem <= 170) totalBusts += 1; // busts en zone de finish
      rem -= t;
    }
    totalVisits += visits;
    legVisits.push(visits);
  }
  legVisits.sort((a, b) => a - b);
  const avgVisits = totalVisits / LEGS;
  const avgPerVisit = 501 / avgVisits;
  const p95 = legVisits[Math.floor(LEGS * 0.95)];
  console.log(
    `${tier.padEnd(11)} | ${avgPerVisit.toFixed(1).padStart(9)} | ${avgVisits
      .toFixed(1)
      .padStart(10)} | ${(totalBusts / LEGS).toFixed(2).padStart(9)} | best ${legVisits[0]} · p95 ${p95}`
  );
}
