/*
  Warnings:

  - A unique constraint covering the columns `[userId,semesterPeriodId]` on the table `UserSemesterScore` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserSemesterScore_userId_semester_key";

-- AlterTable
ALTER TABLE "JRPointsReport" ALTER COLUMN "directorsNotes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "JRPointsSolicitation" ALTER COLUMN "directorsNotes" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserSemesterScore_userId_semesterPeriodId_key" ON "UserSemesterScore"("userId", "semesterPeriodId");
