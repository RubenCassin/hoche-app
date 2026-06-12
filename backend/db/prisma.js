// ─── Accès Prisma ─────────────────────────────────────────────────────────────
// Singleton PrismaClient + helpers JSON pour les champs sérialisés (SQLite n'a
// pas de type Json natif — voir schema.prisma). Les mappers *ToApi rendent les
// formes EXACTES qu'attendait le client avec l'ancienne base JSON (user_id,
// finished_at, tableaux parsés…) : les routes changent de requêtes, pas de
// contrat.
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// URL absolue par défaut : `node backend/server.js` est lancé depuis la racine
// du repo, on ne dépend ni du CWD ni du chargement du .env. En prod, définir
// DATABASE_URL (absolu, ex. file:/data/oche.db sur le volume).
const DEFAULT_URL = 'file:' + path.join(__dirname, 'oche.db').replace(/\\/g, '/');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || DEFAULT_URL } },
});

// ── JSON helpers ──────────────────────────────────────────────────────────────
function jarr(s) {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
function jobj(s) {
  try { const v = JSON.parse(s); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
function jstr(v, fallback) {
  return JSON.stringify(v == null ? fallback : v);
}

// ── Mappers vers les formes historiques de l'API ──────────────────────────────
function iso(d) {
  return d instanceof Date ? d.toISOString() : d;
}

/** Forme « legacy » d'une partie (celle du fichier JSON / de l'API actuelle). */
function gameToApi(g) {
  if (!g) return null;
  return {
    id: g.id,
    user_id: g.userId,
    gameType: g.gameType,
    matchWon: g.matchWon,
    legsWon: g.legsWon,
    legsPlayed: g.legsPlayed,
    opponents: jarr(g.opponents),
    opponentIds: jarr(g.opponentIds),
    dartsThrown: g.dartsThrown,
    avg: g.avg,
    total180s: g.total180s,
    highestCheckout: g.highestCheckout,
    score: g.score,
    heatmap: jobj(g.heatmap),
    checkoutAttempts: g.checkoutAttempts,
    checkoutHits: g.checkoutHits,
    doublesHit: g.doublesHit,
    first9Points: g.first9Points,
    first9Darts: g.first9Darts,
    startScore: g.startScore,
    visits: jarr(g.visits),
    online: g.online,
    suspect: g.suspect,
    reported: g.reported,
    confirmed: g.confirmed,
    confirmedBy: jarr(g.confirmedBy),
    finished_at: iso(g.finishedAt),
  };
}

/** Objet user public (jamais de hash / push tokens) — remplace auth.publicUser. */
function userToPublic(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    created_at: iso(u.createdAt),
    country: u.country || null,
    countryCode: u.countryCode || null,
    region: u.region || null,
    city: u.city || null,
    avatarUrl: u.avatarUrl || null,
    elo: typeof u.elo === 'number' ? u.elo : 1000,
    eloGames: u.eloGames || 0,
    flags: u.flags || 0,
  };
}

/** Toutes les parties groupées par joueur (forme API) — pour les classements,
 *  qui agrègent les stats de tout le monde en un seul passage. */
async function gamesByUser() {
  const games = await prisma.game.findMany();
  const map = new Map();
  for (const g of games) {
    const arr = map.get(g.userId) || [];
    arr.push(gameToApi(g));
    map.set(g.userId, arr);
  }
  return map;
}

module.exports = { prisma, jarr, jobj, jstr, gameToApi, userToPublic, gamesByUser };
