-- AlterTable
ALTER TABLE "Recognition" ADD COLUMN     "receivedFromId" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "last_active_at" DROP NOT NULL,
ALTER COLUMN "last_active_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_receivedFromId_fkey" FOREIGN KEY ("receivedFromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
