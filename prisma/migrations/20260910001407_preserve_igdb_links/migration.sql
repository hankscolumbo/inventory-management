-- Step 1: Create the Game table
CREATE TABLE "Game" (
    "igdbId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "coverUrl" TEXT,
    "releaseYear" INTEGER,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "developers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("igdbId")
);

-- Step 2: SAFE BACKFILL - Create stub Game records from existing GameLogs
-- This guarantees every foreign key reference in GameLog exists in Game BEFORE adding the constraint.
INSERT INTO "Game" ("igdbId", "name", "genres", "developers", "platforms", "updatedAt")
SELECT DISTINCT 
    "igdbId", 
    "gameTitle", 
    ARRAY[]::TEXT[], 
    ARRAY[]::TEXT[], 
    ARRAY[]::TEXT[], 
    NOW()
FROM "GameLog"
WHERE "igdbId" IS NOT NULL AND "igdbId" > 0
ON CONFLICT ("igdbId") DO NOTHING;

-- Step 3: Add foreign key constraint safely
ALTER TABLE "GameLog" 
ADD CONSTRAINT "GameLog_igdbId_fkey" 
FOREIGN KEY ("igdbId") 
REFERENCES "Game"("igdbId") 
ON DELETE SET NULL 
ON UPDATE CASCADE;
