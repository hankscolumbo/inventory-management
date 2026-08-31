-- AlterTable
ALTER TABLE "GameLog" ADD COLUMN     "psnTitleId" TEXT,
ALTER COLUMN "psnTitleIds" DROP DEFAULT;
