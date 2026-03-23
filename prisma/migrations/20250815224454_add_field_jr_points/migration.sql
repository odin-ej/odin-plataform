-- AlterTable
ALTER TABLE "JRPointsReport" ADD COLUMN     "isForEnterprise" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "JRPointsSolicitation" ADD COLUMN     "isForEnterprise" BOOLEAN NOT NULL DEFAULT false;
