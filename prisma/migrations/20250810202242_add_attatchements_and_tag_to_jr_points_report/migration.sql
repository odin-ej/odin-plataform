/*
  Warnings:

  - Added the required column `tagId` to the `JRPointsReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FileAttachment" ADD COLUMN     "jRPointsReportId" TEXT;

-- AlterTable
ALTER TABLE "JRPointsReport" ADD COLUMN     "tagId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "userSemesterScoreId" TEXT;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userSemesterScoreId_fkey" FOREIGN KEY ("userSemesterScoreId") REFERENCES "UserSemesterScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_jRPointsReportId_fkey" FOREIGN KEY ("jRPointsReportId") REFERENCES "JRPointsReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsReport" ADD CONSTRAINT "JRPointsReport_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
