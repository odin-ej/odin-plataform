-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "jrPointsVersionId" TEXT;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_jrPointsVersionId_fkey" FOREIGN KEY ("jrPointsVersionId") REFERENCES "JRPointsVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
