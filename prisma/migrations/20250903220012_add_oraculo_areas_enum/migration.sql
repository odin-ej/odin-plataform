/*
  Warnings:

  - You are about to drop the column `restrictedToArea` on the `OraculoFolder` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OraculoAreas" AS ENUM ('GERAL', 'CONSULTORIA', 'DIRETORIA', 'TATICO', 'PRESIDENCIA', 'OPERACOES', 'PESSOAS', 'PROJETOS', 'MERCADO');

-- AlterTable
ALTER TABLE "OraculoFile" ADD COLUMN     "restrictedToAreas" "OraculoAreas"[];

-- AlterTable
ALTER TABLE "OraculoFolder" DROP COLUMN "restrictedToArea",
ADD COLUMN     "restrictedToAreas" "OraculoAreas"[];
