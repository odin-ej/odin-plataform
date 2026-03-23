/*
  Warnings:

  - Added the required column `directorsNotes` to the `JRPointsReport` table without a default value. This is not possible if the table is not empty.
  - Made the column `directorsNotes` on table `JRPointsSolicitation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "JRPointsReport" ADD COLUMN     "directorsNotes" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "JRPointsSolicitation" ALTER COLUMN "directorsNotes" SET NOT NULL;
