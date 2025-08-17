/*
  Warnings:

  - You are about to drop the column `datePerformed` on the `JRPointsSolicitation` table. All the data in the column will be lost.
  - Added the required column `date_performed` to the `JRPointsSolicitation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "JRPointsSolicitation" DROP COLUMN "datePerformed",
ADD COLUMN     "date_performed" TIMESTAMP(3) NOT NULL;
