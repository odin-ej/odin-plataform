-- DropForeignKey
ALTER TABLE "FileAttachment" DROP CONSTRAINT "FileAttachment_jRPointsReportId_fkey";

-- DropForeignKey
ALTER TABLE "JRPointsReport" DROP CONSTRAINT "JRPointsReport_enterpriseSemesterScoreId_fkey";

-- DropForeignKey
ALTER TABLE "JRPointsReport" DROP CONSTRAINT "JRPointsReport_tagId_fkey";

-- DropForeignKey
ALTER TABLE "JRPointsSolicitation" DROP CONSTRAINT "JRPointsSolicitation_enterpriseSemesterScoreId_fkey";

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_jRPointsReportId_fkey" FOREIGN KEY ("jRPointsReportId") REFERENCES "JRPointsReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsSolicitation" ADD CONSTRAINT "JRPointsSolicitation_enterpriseSemesterScoreId_fkey" FOREIGN KEY ("enterpriseSemesterScoreId") REFERENCES "EnterpriseSemesterScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsReport" ADD CONSTRAINT "JRPointsReport_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsReport" ADD CONSTRAINT "JRPointsReport_enterpriseSemesterScoreId_fkey" FOREIGN KEY ("enterpriseSemesterScoreId") REFERENCES "EnterpriseSemesterScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
