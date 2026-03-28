-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('DENUNCIA', 'SUGESTAO', 'FEEDBACK', 'BUG', 'SOLICITACAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TraineeDepartment" AS ENUM ('MARKETING', 'ORGANIZACIONAL', 'FINANCEIRO');

-- CreateEnum
CREATE TYPE "TraineeGradeCategory" AS ENUM ('AVALIACAO_PROCESSUAL', 'PROVA', 'DESAFIO', 'EXTRA');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "category" "ReportCategory" NOT NULL DEFAULT 'OUTRO',
ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TraineeEvaluation" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "department" "TraineeDepartment" NOT NULL,
    "category" "TraineeGradeCategory" NOT NULL,
    "grade" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraineeEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TraineeEvaluation_traineeId_idx" ON "TraineeEvaluation"("traineeId");

-- CreateIndex
CREATE INDEX "TraineeEvaluation_evaluatorId_idx" ON "TraineeEvaluation"("evaluatorId");

-- CreateIndex
CREATE UNIQUE INDEX "TraineeEvaluation_traineeId_department_category_key" ON "TraineeEvaluation"("traineeId", "department", "category");

-- AddForeignKey
ALTER TABLE "TraineeEvaluation" ADD CONSTRAINT "TraineeEvaluation_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraineeEvaluation" ADD CONSTRAINT "TraineeEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
