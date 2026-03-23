-- DropForeignKey
ALTER TABLE "ProfessionalInterest" DROP CONSTRAINT "ProfessionalInterest_categoryId_fkey";

-- AddForeignKey
ALTER TABLE "ProfessionalInterest" ADD CONSTRAINT "ProfessionalInterest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InterestCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
