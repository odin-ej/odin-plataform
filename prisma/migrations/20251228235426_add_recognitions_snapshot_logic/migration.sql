/*
  Warnings:

  - Added the required column `modelTitleSnapshot` to the `Recognition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Recognition" ADD COLUMN     "modelTitleSnapshot" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RecognitionModel" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
