/*
  Warnings:

  - You are about to drop the column `externalGameId` on the `GameLog` table. All the data in the column will be lost.
  - You are about to drop the `ListItem` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,steamAppId]` on the table `GameLog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,igdbId]` on the table `GameLog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,psnTitleId]` on the table `GameLog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[steamId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[psnOnlineId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `isPrivate` to the `CustomList` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CustomList` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameTitle` to the `GameLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `GameLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GameLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ListItem" DROP CONSTRAINT "ListItem_listId_fkey";

-- AlterTable
ALTER TABLE "CustomList" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "GameLog" DROP COLUMN "externalGameId",
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gameTitle" TEXT NOT NULL,
ADD COLUMN     "igdbId" INTEGER,
ADD COLUMN     "isOwned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platforms" TEXT[],
ADD COLUMN     "playtimeHours" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "psnTitleId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "steamAppId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "hashedPassword" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "psnOnlineId" TEXT,
ADD COLUMN     "steamId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- DropTable
DROP TABLE "ListItem";

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "CustomListItem" (
    "id" TEXT NOT NULL,
    "customListId" TEXT NOT NULL,
    "gameTitle" TEXT NOT NULL,
    "coverUrl" TEXT,
    "igdbId" INTEGER,
    "steamAppId" INTEGER,
    "note" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customListId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "GameLog_userId_steamAppId_key" ON "GameLog"("userId", "steamAppId");

-- CreateIndex
CREATE UNIQUE INDEX "GameLog_userId_igdbId_key" ON "GameLog"("userId", "igdbId");

-- CreateIndex
CREATE UNIQUE INDEX "GameLog_userId_psnTitleId_key" ON "GameLog"("userId", "psnTitleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_steamId_key" ON "User"("steamId");

-- CreateIndex
CREATE UNIQUE INDEX "User_psnOnlineId_key" ON "User"("psnOnlineId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomListItem" ADD CONSTRAINT "CustomListItem_customListId_fkey" FOREIGN KEY ("customListId") REFERENCES "CustomList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListFollow" ADD CONSTRAINT "ListFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListFollow" ADD CONSTRAINT "ListFollow_customListId_fkey" FOREIGN KEY ("customListId") REFERENCES "CustomList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
