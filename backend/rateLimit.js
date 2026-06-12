// Limiteur de débit en mémoire, sans dépendance — suffisant pour un backend
// mono-processus. Au passage multi-instances (post-migration), basculer sur un
// store partagé (Redis).
function rateLimit(opts) {
  const windowMs = opts.windowMs;
  const max = opts.max;
  const keyFn = opts.keyFn || function (req) { return req.ip || 'unknown'; };
  const hits = new Map(); // key -> timestamps des requêtes dans la fenêtre

  // Purge périodique pour borner la mémoire.
  const timer = setInterval(function () {
    const cut = Date.now() - windowMs;
    for (const [key, arr] of hits) {
      const keep = arr.filter(function (t) { return t > cut; });
      if (keep.length) hits.set(key, keep);
      else hits.delete(key);
    }
  }, windowMs);
  if (timer.unref) timer.unref();

  return function (req, res, next) {
    const now = Date.now();
    const key = keyFn(req);
    const arr = (hits.get(key) || []).filter(function (t) { return t > now - windowMs; });
    if (arr.length >= max) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: 'Trop de tentatives — réessaie dans quelques minutes.' });
    }
    arr.push(now);
    hits.set(key, arr);
    next();
  };
}

module.exports = { rateLimit };
