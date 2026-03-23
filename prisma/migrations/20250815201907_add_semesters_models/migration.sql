/*
  Warnings:

  - Made the column `jrPointsVersionId` on table `JRPointsReport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userSemesterScoreId` on table `JRPointsReport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `jrPointsVersionId` on table `JRPointsSolicitation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userSemesterScoreId` on table `JRPointsSolicitation` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "JRPointsReport" DROP CONSTRAINT "JRPointsReport_userSemesterScoreId_fkey";

-- DropForeignKey
ALTER TABLE "JRPointsSolicitation" DROP CONSTRAINT "JRPointsSolicitation_userSemesterScoreId_fkey";

-- DropIndex
DROP INDEX "UserSemesterScore_userId_semester_idx";

-- AlterTable
ALTER TABLE "JRPointsReport" ALTER COLUMN "jrPointsVersionId" SET NOT NULL,
ALTER COLUMN "userSemesterScoreId" SET NOT NULL;

-- AlterTable
ALTER TABLE "JRPointsSolicitation" ALTER COLUMN "jrPointsVersionId" SET NOT NULL,
ALTER COLUMN "userSemesterScoreId" SET NOT NULL;

-- AlterTable
ALTER TABLE "UserSemesterScore" ADD COLUMN     "semesterPeriodId" TEXT;

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseSemesterScore" (
    "id" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "semesterPeriodId" TEXT NOT NULL,

    CONSTRAINT "EnterpriseSemesterScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Semester_name_key" ON "Semester"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseSemesterScore_semesterPeriodId_key" ON "EnterpriseSemesterScore"("semesterPeriodId");

-- AddForeignKey
ALTER TABLE "EnterpriseSemesterScore" ADD CONSTRAINT "EnterpriseSemesterScore_semesterPeriodId_fkey" FOREIGN KEY ("semesterPeriodId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSemesterScore" ADD CONSTRAINT "UserSemesterScore_semesterPeriodId_fkey" FOREIGN KEY ("semesterPeriodId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsSolicitation" ADD CONSTRAINT "JRPointsSolicitation_userSemesterScoreId_fkey" FOREIGN KEY ("userSemesterScoreId") REFERENCES "UserSemesterScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsReport" ADD CONSTRAINT "JRPointsReport_userSemesterScoreId_fkey" FOREIGN KEY ("userSemesterScoreId") REFERENCES "UserSemesterScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
