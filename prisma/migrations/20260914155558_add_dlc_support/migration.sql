-- DropIndex
DROP INDEX "GameLog_userId_steamAppId_key";

-- DropIndex
DROP INDEX "GameLog_userId_igdbId_key";

-- AlterTable
ALTER TABLE "CustomListItem" ADD COLUMN     "isDlc" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DLC" (
    "id" TEXT NOT NULL,
    "igdbId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "coverUrl" TEXT,
    "releaseYear" INTEGER,
    "gameIgdbId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DLC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DLCToGameLog" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DLCToGameLog_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "DLC_igdbId_key" ON "DLC"("igdbId");

-- CreateIndex
CREATE INDEX "_DLCToGameLog_B_index" ON "_DLCToGameLog"("B");

-- AddForeignKey
ALTER TABLE "DLC" ADD CONSTRAINT "DLC_gameIgdbId_fkey" FOREIGN KEY ("gameIgdbId") REFERENCES "Game"("igdbId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DLCToGameLog" ADD CONSTRAINT "_DLCToGameLog_A_fkey" FOREIGN KEY ("A") REFERENCES "DLC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DLCToGameLog" ADD CONSTRAINT "_DLCToGameLog_B_fkey" FOREIGN KEY ("B") REFERENCES "GameLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

