-- AlterTable
ALTER TABLE "JRPointsReport" ADD COLUMN     "reviewerId" TEXT;

-- AlterTable
ALTER TABLE "JRPointsSolicitation" ADD COLUMN     "reviewerId" TEXT;

-- AddForeignKey
ALTER TABLE "JRPointsSolicitation" ADD CONSTRAINT "JRPointsSolicitation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsReport" ADD CONSTRAINT "JRPointsReport_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
