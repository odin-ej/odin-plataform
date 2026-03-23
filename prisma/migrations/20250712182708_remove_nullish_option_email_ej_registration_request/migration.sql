/*
  Warnings:

  - Made the column `emailEJ` on table `RegistrationRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "RegistrationRequest" ALTER COLUMN "emailEJ" SET NOT NULL;
