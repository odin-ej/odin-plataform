/*
  Warnings:

  - Made the column `userId` on table `UsefulLink` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UsefulLink" ALTER COLUMN "userId" SET NOT NULL;
