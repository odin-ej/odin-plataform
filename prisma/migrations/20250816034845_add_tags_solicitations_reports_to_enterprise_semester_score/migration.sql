-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "enterpriseSemesterScoreId" TEXT;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_enterpriseSemesterScoreId_fkey" FOREIGN KEY ("enterpriseSemesterScoreId") REFERENCES "EnterpriseSemesterScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
