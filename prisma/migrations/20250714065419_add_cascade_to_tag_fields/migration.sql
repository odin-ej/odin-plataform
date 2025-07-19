-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_actionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_enterprisePointsId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_userPointsId_fkey";

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_actionTypeId_fkey" FOREIGN KEY ("actionTypeId") REFERENCES "ActionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userPointsId_fkey" FOREIGN KEY ("userPointsId") REFERENCES "UserPoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_enterprisePointsId_fkey" FOREIGN KEY ("enterprisePointsId") REFERENCES "EnterprisePoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
