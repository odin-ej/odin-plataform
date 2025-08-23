-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_enterpriseSemesterScoreId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_userSemesterScoreId_fkey";

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userSemesterScoreId_fkey" FOREIGN KEY ("userSemesterScoreId") REFERENCES "UserSemesterScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_enterpriseSemesterScoreId_fkey" FOREIGN KEY ("enterpriseSemesterScoreId") REFERENCES "EnterpriseSemesterScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
