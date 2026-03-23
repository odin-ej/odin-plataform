/*
  Warnings:

  - You are about to drop the column `birthDate` on the `RegistrationRequest` table. All the data in the column will be lost.
  - You are about to drop the column `isExMember` on the `RegistrationRequest` table. All the data in the column will be lost.
  - You are about to drop the column `semesterEntryEj` on the `RegistrationRequest` table. All the data in the column will be lost.
  - You are about to drop the column `semesterLeaveEj` on the `RegistrationRequest` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phone]` on the table `RegistrationRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `birth_date` to the `RegistrationRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semester_entry_ej` to the `RegistrationRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RegistrationRequest" DROP COLUMN "birthDate",
DROP COLUMN "isExMember",
DROP COLUMN "semesterEntryEj",
DROP COLUMN "semesterLeaveEj",
ADD COLUMN     "birth_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ex_member" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "semester_entry_ej" TEXT NOT NULL,
ADD COLUMN     "semester_leave_ej" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationRequest_phone_key" ON "RegistrationRequest"("phone");
