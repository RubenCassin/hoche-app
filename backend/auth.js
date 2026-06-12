const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'oche-dev-secret-change-me';
const TOKEN_TTL = '30d';

function signToken(userId) {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

/** Express middleware: require a valid Bearer token; sets req.userId. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.uid;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

module.exports = { signToken, requireAuth, JWT_SECRET };
