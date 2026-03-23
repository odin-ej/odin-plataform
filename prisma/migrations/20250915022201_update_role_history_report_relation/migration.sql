/*
  Warnings:

  - You are about to drop the column `userRoleHistoryId` on the `FileAttachment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[managementReportId]` on the table `UserRoleHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FileAttachment" DROP CONSTRAINT "FileAttachment_userRoleHistoryId_fkey";

-- DropIndex
DROP INDEX "FileAttachment_userRoleHistoryId_key";

-- AlterTable
ALTER TABLE "FileAttachment" DROP COLUMN "userRoleHistoryId";

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleHistory_managementReportId_key" ON "UserRoleHistory"("managementReportId");

-- AddForeignKey
ALTER TABLE "UserRoleHistory" ADD CONSTRAINT "UserRoleHistory_managementReportId_fkey" FOREIGN KEY ("managementReportId") REFERENCES "FileAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
