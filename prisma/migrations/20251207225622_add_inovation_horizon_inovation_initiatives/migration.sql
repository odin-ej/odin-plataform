-- CreateEnum
CREATE TYPE "InovationHorizonTypes" AS ENUM ('Incremental', 'Arquitetural', 'Disruptiva', 'Modular');

-- AlterTable
ALTER TABLE "InovationInitiative" ADD COLUMN     "inovationHorizon" "InovationHorizonTypes";
