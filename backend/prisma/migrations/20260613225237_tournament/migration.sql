-- CreateTable
CREATE TABLE "Tournament" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversationId" INTEGER,
    "name" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "startScore" INTEGER NOT NULL DEFAULT 501,
    "legsToWin" INTEGER NOT NULL DEFAULT 1,
    "finishMode" TEXT NOT NULL DEFAULT 'double',
    "winnerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TournamentPlayer" (
    "tournamentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL DEFAULT 0,
    "place" INTEGER,

    PRIMARY KEY ("tournamentId", "userId"),
    CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TournamentMatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "player1Id" INTEGER,
    "player2Id" INTEGER,
    "winnerId" INTEGER,
    "roomCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT "TournamentMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TournamentMatch_tournamentId_round_idx" ON "TournamentMatch"("tournamentId", "round");
