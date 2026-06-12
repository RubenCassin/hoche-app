# HOCHE backend — Node + Prisma/SQLite (base sur volume persistant).
# Build par l'hébergeur (Railway/Fly) ; en local : docker build -t hoche-backend .
FROM node:20-slim

# OpenSSL requis par le moteur Prisma.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=3001
# DATABASE_URL est fourni par l'hébergeur et DOIT pointer le volume monté,
# ex. file:/data/oche.db — sinon la base disparaît à chaque déploiement.
EXPOSE 3001

# Applique les migrations puis démarre (idempotent à chaque déploiement).
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
