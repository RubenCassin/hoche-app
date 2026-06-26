-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT,
    "countryCode" TEXT,
    "region" TEXT,
    "city" TEXT,
    "avatarUrl" TEXT,
    "elo" INTEGER NOT NULL DEFAULT 1000,
    "eloGames" INTEGER NOT NULL DEFAULT 0,
    "flags" INTEGER NOT NULL DEFAULT 0,
    "suspect" BOOLEAN NOT NULL DEFAULT false,
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "pushTokens" TEXT NOT NULL DEFAULT '[]',
    "badges" TEXT NOT NULL DEFAULT '[]',
    "favoriteDoubles" TEXT NOT NULL DEFAULT '[]'
);
INSERT INTO "new_User" ("avatarUrl", "badges", "city", "country", "countryCode", "createdAt", "demo", "elo", "eloGames", "flags", "id", "name", "passwordHash", "pushTokens", "region", "suspect", "username") SELECT "avatarUrl", "badges", "city", "country", "countryCode", "createdAt", "demo", "elo", "eloGames", "flags", "id", "name", "passwordHash", "pushTokens", "region", "suspect", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
