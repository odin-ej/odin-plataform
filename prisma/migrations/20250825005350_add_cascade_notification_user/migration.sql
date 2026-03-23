-- DropForeignKey
ALTER TABLE "NotificationUser" DROP CONSTRAINT "NotificationUser_notificationId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationUser" DROP CONSTRAINT "NotificationUser_userId_fkey";

-- AddForeignKey
ALTER TABLE "NotificationUser" ADD CONSTRAINT "NotificationUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationUser" ADD CONSTRAINT "NotificationUser_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
