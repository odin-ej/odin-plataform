/*
  Warnings:

  - You are about to drop the column `isForExMember` on the `LinkPoster` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LinkPosterArea" AS ENUM ('MEMBROS', 'EXMEMBROS', 'GERAL', 'HOME', 'YGGDRASIL');

-- AlterTable
ALTER TABLE "LinkPoster" DROP COLUMN "isForExMember",
ADD COLUMN     "areas" "LinkPosterArea"[];
