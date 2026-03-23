-- CreateEnum
CREATE TYPE "AreaInovationInitiative" AS ENUM ('Geral', 'Mercado', 'Projetos', 'Presidência', 'Pessoas', 'Operações');

-- CreateEnum
CREATE TYPE "SubAreaInovationInitiative" AS ENUM ('Eventos', 'Performance', 'Marketing', 'Comercial', 'Inovação');

-- CreateEnum
CREATE TYPE "InovationInitiativeStatus" AS ENUM ('PENDING', 'APPROVED', 'RUNNING', 'REJECTED');

-- CreateTable
CREATE TABLE "InovationInitiative" (
    "id" TEXT NOT NULL,
    "status" "InovationInitiativeStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "tags" TEXT[],
    "links" TEXT[],
    "dateImplemented" TIMESTAMP(3),
    "dateColected" TIMESTAMP(3),
    "dateChecked" TIMESTAMP(3),
    "isRunning" BOOLEAN NOT NULL DEFAULT false,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "areas" "AreaInovationInitiative"[],
    "subAreas" "SubAreaInovationInitiative"[],
    "sentido" TEXT,
    "organizacao" TEXT,
    "cultura" TEXT,
    "influencia" TEXT,
    "operacao" TEXT,

    CONSTRAINT "InovationInitiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeRelation" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,

    CONSTRAINT "InitiativeRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InitiativesMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InitiativesMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "InitiativeRelation_fromId_toId_key" ON "InitiativeRelation"("fromId", "toId");

-- CreateIndex
CREATE INDEX "_InitiativesMembers_B_index" ON "_InitiativesMembers"("B");

-- AddForeignKey
ALTER TABLE "InovationInitiative" ADD CONSTRAINT "InovationInitiative_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InovationInitiative" ADD CONSTRAINT "InovationInitiative_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InovationInitiative" ADD CONSTRAINT "InovationInitiative_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeRelation" ADD CONSTRAINT "InitiativeRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "InovationInitiative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeRelation" ADD CONSTRAINT "InitiativeRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "InovationInitiative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InitiativesMembers" ADD CONSTRAINT "_InitiativesMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "InovationInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InitiativesMembers" ADD CONSTRAINT "_InitiativesMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
