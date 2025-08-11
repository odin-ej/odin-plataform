/*
  Warnings:

  - The values [DRAFT,SUBMITTED] on the enum `JRPointsReportStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JRPointsReportStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "JRPointsReport" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "JRPointsReport" ALTER COLUMN "status" TYPE "JRPointsReportStatus_new" USING ("status"::text::"JRPointsReportStatus_new");
ALTER TYPE "JRPointsReportStatus" RENAME TO "JRPointsReportStatus_old";
ALTER TYPE "JRPointsReportStatus_new" RENAME TO "JRPointsReportStatus";
DROP TYPE "JRPointsReportStatus_old";
ALTER TABLE "JRPointsReport" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "JRPointsReport" ALTER COLUMN "status" SET DEFAULT 'PENDING';
