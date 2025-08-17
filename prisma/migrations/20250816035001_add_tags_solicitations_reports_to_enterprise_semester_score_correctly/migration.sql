-- AlterTable
ALTER TABLE "JRPointsReport" ADD COLUMN     "enterpriseSemesterScoreId" TEXT;

-- AlterTable
ALTER TABLE "JRPointsSolicitation" ADD COLUMN     "enterpriseSemesterScoreId" TEXT;

-- AddForeignKey
ALTER TABLE "JRPointsSolicitation" ADD CONSTRAINT "JRPointsSolicitation_enterpriseSemesterScoreId_fkey" FOREIGN KEY ("enterpriseSemesterScoreId") REFERENCES "EnterpriseSemesterScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsReport" ADD CONSTRAINT "JRPointsReport_enterpriseSemesterScoreId_fkey" FOREIGN KEY ("enterpriseSemesterScoreId") REFERENCES "EnterpriseSemesterScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
