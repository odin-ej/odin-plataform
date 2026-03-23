-- CreateEnum
CREATE TYPE "ItemAreas" AS ENUM ('CONSULTORIA', 'TATICO', 'DIRETORIA', 'GERAL');

-- AlterTable
ALTER TABLE "ReservableItem" ADD COLUMN     "areas" "ItemAreas"[];
