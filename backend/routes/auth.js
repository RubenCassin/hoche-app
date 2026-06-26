const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { prisma, userToPublic, jarr, jstr } = require('../db/prisma');
const { signToken, requireAuth } = require('../auth');
const { rateLimit } = require('../rateLimit');
const { AVATAR_DIR } = require('../storage');
const crypto = require('crypto');
const { sendMail, wrap } = require('../mail');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// → null si vide, undefined si invalide, sinon l'email normalisé.
function cleanEmail(raw) {
  const e = String(raw == null ? '' : raw).trim().toLowerCase();
  if (!e) return null;
  if (e.length > 120 || !EMAIL_RE.test(e)) return undefined;
  return e;
}
// Vue « privée » : userToPublic + email (jamais exposé sur les profils publics).
function meView(u) { return Object.assign({}, userToPublic(u), { email: u.email || null }); }
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function normalizeUsername(raw) {
  const u = String(raw || '').trim().toLowerCase().replace(/^@+/, '');
  return u ? '@' + u : '';
}

function passwordError(password) {
  if (password.length < 8 || password.length > 72 || !/[a-zA-Zà-ÿÀ-Ÿ]/.test(password) || !/\d/.test(password)) {
    return 'Mot de passe : 8 caractères min., avec au moins une lettre et un chiffre.';
  }
  return null;
}

// ── Anti brute-force ──────────────────────────────────────────────────────────
// Caps par IP sur les routes publiques + verrou par pseudo après échecs répétés
// (le verrou ne compte que les VRAIS échecs, pour ne pas bloquer une soirée où
// tout le monde se connecte depuis le même réseau).
const registerLimit = rateLimit({ windowMs: 30 * 60 * 1000, max: 10 });
const loginIpLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const recoverLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8 });

const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_MAX = 10;
const failedLogins = new Map(); // username -> { count, first }
function loginLocked(username) {
  const e = failedLogins.get(username);
  if (!e) return false;
  if (Date.now() - e.first > FAIL_WINDOW_MS) {
    failedLogins.delete(username);
    return false;
  }
  return e.count >= FAIL_MAX;
}
function noteLoginFail(username) {
  const e = failedLogins.get(username);
  if (!e || Date.now() - e.first > FAIL_WINDOW_MS) {
    failedLogins.set(username, { count: 1, first: Date.now() });
  } else {
    e.count += 1;
  }
}

// POST /auth/register { name, username, password }
router.post('/register', registerLimit, async function (req, res, next) {
  try {
    const name = String(req.body.name || '').trim();
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || '');

    if (!name || name.length > 40) return res.status(400).json({ error: 'Nom requis (40 caractères max.)' });
    if (!/^@[a-z0-9_.]{2,20}$/.test(username))
      return res.status(400).json({ error: 'Pseudo invalide (2-20 car. : a-z, 0-9, _ .)' });
    const pwErr = passwordError(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const email = cleanEmail(req.body.email);
    if (email === undefined) return res.status(400).json({ error: 'Email invalide' });

    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken) return res.status(409).json({ error: 'Ce pseudo est déjà pris' });

    const user = await prisma.user.create({
      data: { name, username, email, passwordHash: bcrypt.hashSync(password, 10) },
    });
    res.status(201).json({ token: signToken(user.id), user: meView(user) });
  } catch (e) { next(e); }
});

// POST /auth/login { username, password }
router.post('/login', loginIpLimit, async function (req, res, next) {
  try {
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || '');

    if (loginLocked(username)) {
      return res.status(429).json({ error: 'Trop de tentatives pour ce compte — réessaie dans 15 minutes.' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      noteLoginFail(username);
      return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' });
    }

    failedLogins.delete(username);
    res.json({ token: signToken(user.id), user: meView(user) });
  } catch (e) { next(e); }
});

// GET /auth/me  (auth)
router.get('/me', requireAuth, async function (req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Compte introuvable' });
    res.json(meView(user));
  } catch (e) { next(e); }
});

// PATCH /auth/me { name?, avatarUrl?, currentPassword?, newPassword? }  (auth)
// Édition du compte : nom affiché, avatar, changement de mot de passe.
router.patch('/me', requireAuth, async function (req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Compte introuvable' });

    const data = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name || name.length > 40) return res.status(400).json({ error: 'Nom requis (40 caractères max.)' });
      data.name = name;
    }
    if (req.body.avatarUrl !== undefined) {
      const a = req.body.avatarUrl === null ? null : String(req.body.avatarUrl).trim();
      if (a && (a.length > 500 || !/^https?:\/\//.test(a))) {
        return res.status(400).json({ error: 'URL d’avatar invalide (http(s), 500 car. max.)' });
      }
      data.avatarUrl = a || null;
    }
    if (req.body.newPassword !== undefined) {
      const current = String(req.body.currentPassword || '');
      if (!bcrypt.compareSync(current, user.passwordHash)) {
        return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      }
      const pwErr = passwordError(String(req.body.newPassword || ''));
      if (pwErr) return res.status(400).json({ error: pwErr });
      data.passwordHash = bcrypt.hashSync(String(req.body.newPassword), 10);
    }
    if (req.body.favoriteDoubles !== undefined) {
      const arr = Array.isArray(req.body.favoriteDoubles) ? req.body.favoriteDoubles : [];
      const clean = [...new Set(arr.map((n) => parseInt(n, 10)).filter((n) => (n >= 1 && n <= 20) || n === 25))].slice(0, 21);
      data.favoriteDoubles = jstr(clean);
    }
    if (req.body.email !== undefined) {
      const email = cleanEmail(req.body.email);
      if (email === undefined) return res.status(400).json({ error: 'Email invalide' });
      data.email = email;
    }

    const updated = await prisma.user.update({ where: { id: req.userId }, data });
    res.json(meView(updated));
  } catch (e) { next(e); }
});

// DELETE /auth/me { password }  (auth)
// Suppression du compte avec cascade : parties, social, notifs, Elo, blocs
// (FK onDelete: Cascade) + nettoyage des références croisées (likes, notifs
// émises, opponentIds chez les adversaires).
router.delete('/me', requireAuth, async function (req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Compte introuvable' });
    if (!bcrypt.compareSync(String(req.body.password || ''), user.passwordHash)) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }
    const id = req.userId;

    // Références croisées hors FK.
    await prisma.notification.deleteMany({ where: { actorId: id } });

    const likedPosts = await prisma.post.findMany({
      where: { likes: { contains: '' + id } }, // pré-filtre large, re-vérifié en JS
      select: { id: true, likes: true },
    });
    for (const p of likedPosts) {
      const likes = jarr(p.likes);
      if (likes.includes(id)) {
        await prisma.post.update({ where: { id: p.id }, data: { likes: jstr(likes.filter((x) => x !== id)) } });
      }
    }

    const oppGames = await prisma.game.findMany({
      where: { opponentIds: { contains: '' + id } },
      select: { id: true, opponentIds: true },
    });
    for (const g of oppGames) {
      const ids = jarr(g.opponentIds);
      if (ids.includes(id)) {
        await prisma.game.update({ where: { id: g.id }, data: { opponentIds: jstr(ids.filter((x) => x !== id)) } });
      }
    }

    await prisma.user.delete({ where: { id } }); // cascade le reste
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /auth/location { country, countryCode, region, city }  (auth)
// Updates the signed-in user's location (drives the geo leaderboard).
router.post('/location', requireAuth, async function (req, res, next) {
  try {
    const clip = function (v, n) { return v ? String(v).trim().slice(0, n) : null; };
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        country: clip(req.body.country, 60),
        countryCode: req.body.countryCode ? String(req.body.countryCode).trim().toUpperCase().slice(0, 2) : null,
        region: clip(req.body.region, 80),
        city: clip(req.body.city, 80),
      },
    });
    res.json(userToPublic(updated));
  } catch (e) { next(e); }
});

// POST /auth/forgot-password { email } — envoie un lien de reset si un compte
// existe pour cet email. Réponse toujours 200 (ne révèle pas l'existence).
router.post('/forgot-password', recoverLimit, async function (req, res, next) {
  try {
    const email = cleanEmail(req.body.email);
    if (!email) return res.json({ ok: true });
    const base = `${req.protocol}://${req.get('host')}`;
    const users = await prisma.user.findMany({ where: { email } });
    for (const u of users) {
      const token = crypto.randomBytes(32).toString('hex');
      const exp = new Date(Date.now() + 60 * 60 * 1000); // 1 h
      await prisma.user.update({ where: { id: u.id }, data: { resetTokenHash: sha256(token), resetTokenExp: exp } });
      const link = `${base}/app/reset?token=${token}`;
      await sendMail(email, 'Réinitialise ton mot de passe HOCHE', wrap(
        'Mot de passe oublié ?',
        `<p>Une réinitialisation a été demandée pour <b>${u.username}</b>.</p>
         <p><a href="${link}" style="display:inline-block;background:#c8472f;color:#fff;padding:10px 18px;text-decoration:none">Choisir un nouveau mot de passe</a></p>
         <p style="color:#888;font-size:12px">Lien valable 1 heure : ${link}</p>`
      ));
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /auth/reset-password { token, newPassword } — applique le nouveau mdp.
router.post('/reset-password', recoverLimit, async function (req, res, next) {
  try {
    const token = String(req.body.token || '');
    const pwErr = passwordError(String(req.body.newPassword || ''));
    if (pwErr) return res.status(400).json({ error: pwErr });
    if (!token) return res.status(400).json({ error: 'Lien invalide' });
    const user = await prisma.user.findFirst({
      where: { resetTokenHash: sha256(token), resetTokenExp: { gt: new Date() } },
    });
    if (!user) return res.status(400).json({ error: 'Lien invalide ou expiré' });
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: bcrypt.hashSync(String(req.body.newPassword), 10), resetTokenHash: null, resetTokenExp: null },
    });
    res.json({ ok: true, username: user.username });
  } catch (e) { next(e); }
});

// POST /auth/forgot-username { email } — rappelle le(s) pseudo(s) par email.
router.post('/forgot-username', recoverLimit, async function (req, res, next) {
  try {
    const email = cleanEmail(req.body.email);
    if (!email) return res.json({ ok: true });
    const users = await prisma.user.findMany({ where: { email }, select: { username: true } });
    if (users.length > 0) {
      const list = users.map((u) => `<li><b>${u.username}</b></li>`).join('');
      await sendMail(email, 'Ton identifiant HOCHE', wrap(
        'Identifiant oublié ?',
        `<p>Le(s) pseudo(s) associé(s) à cet email :</p><ul>${list}</ul>
         <p>Connecte-toi sur HOCHE avec celui-ci.</p>`
      ));
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /auth/avatar { dataUrl }  (auth) — upload d'un avatar (image en data URL
// base64, redimensionnée petit côté client). Écrit dans le volume persistant et
// pose une avatarUrl absolue (marche pour le web ET le mobile).
router.post('/avatar', requireAuth, async function (req, res, next) {
  try {
    const dataUrl = String(req.body.dataUrl || '');
    const m = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return res.status(400).json({ error: 'Image invalide (png / jpg / webp attendu)' });
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length < 64) return res.status(400).json({ error: 'Image vide' });
    if (buf.length > 220 * 1024) return res.status(413).json({ error: 'Image trop lourde — réduis-la (≈ 256 px).' });
    // Un seul fichier par compte (on écrase, et on nettoie les autres extensions).
    for (const e of ['png', 'jpg', 'webp']) {
      if (e !== ext) { try { fs.unlinkSync(path.join(AVATAR_DIR, `u${req.userId}.${e}`)); } catch (_) { /* absent */ } }
    }
    fs.writeFileSync(path.join(AVATAR_DIR, `u${req.userId}.${ext}`), buf);
    const base = `${req.protocol}://${req.get('host')}`;
    const url = `${base}/uploads/avatars/u${req.userId}.${ext}?v=${Date.now()}`;
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { avatarUrl: url } });
    res.json(userToPublic(updated));
  } catch (e) { next(e); }
});

// POST /auth/push-token { token }  (auth)
// Registers an Expo push token for this account (deduped).
router.post('/push-token', requireAuth, async function (req, res, next) {
  try {
    const token = String(req.body.token || '').trim();
    if (!token || token.length > 200) return res.status(400).json({ error: 'Token manquant ou invalide' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Compte introuvable' });

    const tokens = jarr(user.pushTokens);
    if (!tokens.includes(token)) {
      tokens.push(token);
      await prisma.user.update({ where: { id: req.userId }, data: { pushTokens: jstr(tokens) } });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
