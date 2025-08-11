/*
  Warnings:

  - Added the required column `date_performed` to the `TagTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TagTemplate" ADD COLUMN     "date_performed" TIMESTAMP(3) NOT NULL;
