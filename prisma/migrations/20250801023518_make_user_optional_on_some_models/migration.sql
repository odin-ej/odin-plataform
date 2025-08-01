-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_referentId_fkey";

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "referentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RoomReservation" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "authorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_referentId_fkey" FOREIGN KEY ("referentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
