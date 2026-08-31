/*
  Warnings:

  - You are about to drop the column `psnTitleId` on the `GameLog` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,psnTitleIds]` on the table `GameLog` will be added. If there are existing duplicate values, this will fail.

*/
-- 1. Add the new array column
ALTER TABLE "GameLog" ADD COLUMN "psnTitleIds" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;

-- 2. Backfill existing psnTitleId values into single-element arrays
UPDATE "GameLog"
SET "psnTitleIds" = ARRAY["psnTitleId"]
WHERE "psnTitleId" IS NOT NULL;

-- 3. Drop the old column
ALTER TABLE "GameLog" DROP COLUMN "psnTitleId";

