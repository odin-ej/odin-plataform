/*
  Warnings:

  - A unique constraint covering the columns `[userRoleHistoryId]` on the table `FileAttachment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "UserRoleHistory" DROP CONSTRAINT "UserRoleHistory_managementReportId_fkey";

-- AlterTable
ALTER TABLE "FileAttachment" ADD COLUMN     "userRoleHistoryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FileAttachment_userRoleHistoryId_key" ON "FileAttachment"("userRoleHistoryId");

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_userRoleHistoryId_fkey" FOREIGN KEY ("userRoleHistoryId") REFERENCES "UserRoleHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
