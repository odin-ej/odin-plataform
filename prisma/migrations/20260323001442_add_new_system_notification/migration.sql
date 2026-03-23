-- CreateEnum
CREATE TYPE "NotificationScope" AS ENUM ('USER', 'ROLE', 'AREA', 'ALL');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'EVENT');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "isEvent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priority" "NotificationPriority" DEFAULT 'NORMAL',
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "scope" "NotificationScope",
ADD COLUMN     "targetArea" "AreaRoles",
ADD COLUMN     "targetRoleId" TEXT,
ADD COLUMN     "title" TEXT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
