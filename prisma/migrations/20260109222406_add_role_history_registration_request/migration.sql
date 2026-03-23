-- AlterTable
ALTER TABLE "UserRoleHistory" ADD COLUMN     "registrationId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "UserRoleHistory" ADD CONSTRAINT "UserRoleHistory_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "RegistrationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
