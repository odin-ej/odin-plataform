-- CreateEnum
CREATE TYPE "RecognitionType" AS ENUM ('CULTURAL', 'PERFORMANCE', 'RESULTADO');

-- CreateEnum
CREATE TYPE "RecognitionAreas" AS ENUM ('GERAL', 'MERCADO', 'PRESIDÊNCIA', 'PROJETOS', 'PESSOAS', 'OPERACOES');

-- AlterTable
ALTER TABLE "FileAttachment" ADD COLUMN     "recognitionId" TEXT;

-- CreateTable
CREATE TABLE "MonthlyValueSchedule" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "valueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyValueSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecognitionModel" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "RecognitionType" NOT NULL,
    "areas" "RecognitionAreas"[] DEFAULT ARRAY['GERAL']::"RecognitionAreas"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecognitionModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recognition" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "description" TEXT,
    "recognitionModelId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "valueId" TEXT,

    CONSTRAINT "Recognition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserRecognitions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserRecognitions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyValueSchedule_month_year_key" ON "MonthlyValueSchedule"("month", "year");

-- CreateIndex
CREATE INDEX "_UserRecognitions_B_index" ON "_UserRecognitions"("B");

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_recognitionId_fkey" FOREIGN KEY ("recognitionId") REFERENCES "Recognition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyValueSchedule" ADD CONSTRAINT "MonthlyValueSchedule_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_recognitionModelId_fkey" FOREIGN KEY ("recognitionModelId") REFERENCES "RecognitionModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MonthlyValueSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserRecognitions" ADD CONSTRAINT "_UserRecognitions_A_fkey" FOREIGN KEY ("A") REFERENCES "Recognition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserRecognitions" ADD CONSTRAINT "_UserRecognitions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
