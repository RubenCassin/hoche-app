# OCHE App — Guide de démarrage

## Prérequis

- Node.js 18+ : https://nodejs.org
- Git (optionnel)
- Expo Go sur ton téléphone (App Store / Play Store)

---

## 1. Installer les dépendances

### App mobile
```bash
cd oche-app
npm install
```

### Backend
```bash
cd oche-app/backend
npm install
```

---

## 2. Télécharger les polices Google Fonts

Télécharge ces polices et place les fichiers `.ttf` dans `oche-app/assets/fonts/` :

| Police | Variantes nécessaires | Lien |
|---|---|---|
| Big Shoulders Display | ExtraBold (900), Bold (700) | https://fonts.google.com/specimen/Big+Shoulders+Display |
| Manrope | Regular (400), Medium (500), SemiBold (600), Bold (700) | https://fonts.google.com/specimen/Manrope |
| JetBrains Mono | Regular (400) | https://fonts.google.com/specimen/JetBrains+Mono |

Renomme les fichiers exactement :
```
assets/fonts/
  BigShouldersDisplay-ExtraBold.ttf
  BigShouldersDisplay-Bold.ttf
  Manrope-Regular.ttf
  Manrope-Medium.ttf
  Manrope-SemiBold.ttf
  Manrope-Bold.ttf
  JetBrainsMono-Regular.ttf
```

> **Raccourci** : Télécharge le ZIP Google Fonts et copie les fichiers TTF correspondants.

---

## 3. Lancer le backend

```bash
cd oche-app/backend
npm start
```

Le serveur démarre sur `http://localhost:3001`.

Vérifie que ça marche : http://localhost:3001/health

---

## 4. Lancer l'app

```bash
cd oche-app
npx expo start
```

- **Sur téléphone** : scanne le QR code avec Expo Go
- **Sur émulateur iOS** : appuie `i` dans le terminal (Mac uniquement)
- **Sur émulateur Android** : appuie `a` dans le terminal

---

## 5. Tester sur ton téléphone physique

Si tu utilises Expo Go sur un vrai téléphone, le téléphone doit être sur le même Wi-Fi que ton ordinateur.

Dans `constants/theme.ts`, remplace :
```ts
export const API_BASE_URL = 'http://localhost:3001';
```
par l'IP locale de ton ordi (ex: `http://192.168.1.42:3001`).

Pour trouver ton IP : `ipconfig` (Windows) ou `ifconfig` (Mac).

---

## Structure du projet

```
oche-app/
├── app/                    # Expo Router — écrans
│   ├── _layout.tsx         # Root layout (fonts, providers)
│   ├── tabs/               # Navigation à onglets
│   │   ├── _layout.tsx     # Tab bar OCHE
│   │   ├── index.tsx       # Home — Live sessions + Quick start
│   │   ├── scoring.tsx     # Scoring 501 — DartPad + ScoreTile
│   │   ├── stats.tsx       # Stats — Sparklines + Heatmap
│   │   └── profile.tsx     # Profil — Athlete card + Tweaks
│   ├── moment.tsx          # Fullscreen 180! / Checkout takeover
│   └── new-game.tsx        # Modal — nouvelle partie
├── components/             # Composants OCHE
│   ├── OcheText.tsx        # Typographie (Big Shoulders / Manrope)
│   ├── OcheHeader.tsx      # Header 56px walnut
│   ├── DartPad.tsx         # Pavé de saisie fléchettes
│   ├── ScoreTile.tsx       # Tuile score joueur (flip animation)
│   ├── CheckoutPill.tsx    # Suggestion de checkout (T20/T15/D8...)
│   ├── MonogramPortrait.tsx# Avatar monogramme N&B
│   ├── StatRow.tsx         # Ligne de statistique
│   └── Sparkline.tsx       # Graphique SVG sparkline
├── constants/
│   └── theme.ts            # Tokens OCHE (couleurs, typo, spacing)
├── hooks/
│   └── useGameStore.ts     # État global (Zustand) — scoring local
├── services/
│   └── api.ts              # Client HTTP (axios) → backend
└── backend/                # Serveur Express + SQLite
    ├── server.js
    ├── package.json
    ├── db/
    │   ├── database.js     # Connexion SQLite
    │   └── schema.sql      # Schéma BDD
    └── routes/
        ├── users.js        # CRUD users + stats
        └── games.js        # Parties, visites, undo
```

---

## API du backend

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/health` | Statut du serveur |
| GET | `/users` | Liste des joueurs |
| POST | `/users` | Créer un joueur |
| GET | `/users/:id/stats` | Stats d'un joueur |
| GET | `/games/active` | Parties en cours |
| POST | `/games` | Nouvelle partie |
| GET | `/games/:id` | État d'une partie |
| POST | `/games/:id/visit` | Soumettre une volée |
| DELETE | `/games/:id/visit` | Annuler la dernière volée |

---

## Prochaines étapes

- [ ] Authentification joueur (login simple)
- [ ] WebSocket pour score en temps réel
- [ ] Historique des parties
- [ ] Calcul automatique du meilleur leg
- [ ] Mode Solo (joueur vs bot)
- [ ] Partage social du recap de leg
