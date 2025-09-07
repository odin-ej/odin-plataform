-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "generatedBySolicitationId" TEXT;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_generatedBySolicitationId_fkey" FOREIGN KEY ("generatedBySolicitationId") REFERENCES "JRPointsSolicitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
