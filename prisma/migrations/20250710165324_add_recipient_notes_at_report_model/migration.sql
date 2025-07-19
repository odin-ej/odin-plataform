/*
  Warnings:

  - Added the required column `recipientNotes` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "recipientNotes" TEXT NOT NULL;
