/*
  Warnings:

  - Added the required column `title` to the `ItemReservation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ItemReservation" ADD COLUMN     "title" TEXT NOT NULL;
