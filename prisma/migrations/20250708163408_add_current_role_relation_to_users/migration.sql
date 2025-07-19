-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentRoleId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentRoleId_fkey" FOREIGN KEY ("currentRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
