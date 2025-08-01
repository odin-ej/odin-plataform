-- AlterTable
ALTER TABLE "RegistrationRequest" ADD COLUMN     "isWorking" BOOLEAN,
ADD COLUMN     "workplace" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isWorking" BOOLEAN,
ADD COLUMN     "workplace" TEXT;
