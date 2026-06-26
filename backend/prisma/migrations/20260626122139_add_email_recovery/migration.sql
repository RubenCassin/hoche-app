-- AlterTable
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExp" DATETIME;
ALTER TABLE "User" ADD COLUMN "resetTokenHash" TEXT;
