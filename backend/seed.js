const bcrypt = require('bcryptjs');
const { prisma } = require('./db/prisma');

// Garantit l'existence du compte @admin au boot — et rien d'autre : la base
// reste vierge pour le déploiement (l'ancien seed recréait @lucie + parties
// démo à chaque démarrage).
async function ensureAdmin() {
  const existing = await prisma.user.findUnique({ where: { username: '@admin' } });
  if (existing) return;
  await prisma.user.create({
    data: {
      name: 'Admin',
      username: '@admin',
      passwordHash: bcrypt.hashSync('admin123', 10),
    },
  });
  console.log('Seed → @admin / admin123 créé');
}

module.exports = { ensureAdmin };
