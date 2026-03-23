-- AlterTable
ALTER TABLE "JRPointsReport" ADD COLUMN     "jrPointsVersionId" TEXT,
ADD COLUMN     "userSemesterScoreId" TEXT;

-- AlterTable
ALTER TABLE "JRPointsSolicitation" ADD COLUMN     "jrPointsVersionId" TEXT,
ADD COLUMN     "userSemesterScoreId" TEXT;

-- AddForeignKey
ALTER TABLE "JRPointsSolicitation" ADD CONSTRAINT "JRPointsSolicitation_jrPointsVersionId_fkey" FOREIGN KEY ("jrPointsVersionId") REFERENCES "JRPointsVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsSolicitation" ADD CONSTRAINT "JRPointsSolicitation_userSemesterScoreId_fkey" FOREIGN KEY ("userSemesterScoreId") REFERENCES "UserSemesterScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsReport" ADD CONSTRAINT "JRPointsReport_jrPointsVersionId_fkey" FOREIGN KEY ("jrPointsVersionId") REFERENCES "JRPointsVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsReport" ADD CONSTRAINT "JRPointsReport_userSemesterScoreId_fkey" FOREIGN KEY ("userSemesterScoreId") REFERENCES "UserSemesterScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
