// Change le mot de passe d'un compte (par défaut @admin) — à lancer AVANT tout
// déploiement public (le seed crée @admin / admin123).
// Run :  node backend/setAdminPassword.js <nouveau-mdp> [@pseudo]
const bcrypt = require('bcryptjs');
const { prisma } = require('./db/prisma');

const password = process.argv[2];
const username = process.argv[3] || '@admin';

async function main() {
  if (!password || password.length < 8 || !/[a-zA-Zà-ÿÀ-Ÿ]/.test(password) || !/\d/.test(password)) {
    console.error('Usage : node backend/setAdminPassword.js <mdp: 8 car. min, lettre + chiffre> [@pseudo]');
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error('Compte introuvable :', username);
    process.exit(1);
  }
  await prisma.user.update({
    where: { username },
    data: { passwordHash: bcrypt.hashSync(password, 10) },
  });
  console.log('Mot de passe mis à jour pour', username);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
