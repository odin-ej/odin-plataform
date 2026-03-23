/*
  Warnings:

  - Added the required column `type` to the `InovationInitiative` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InovationInitiativeType" AS ENUM ('Iniciativa', 'Evento', 'Nucleo', 'Pilula');

-- AlterTable
ALTER TABLE "InovationInitiative" ADD COLUMN     "type" "InovationInitiativeType" NOT NULL;
