-- DropForeignKey
ALTER TABLE "InitiativeRelation" DROP CONSTRAINT "InitiativeRelation_fromId_fkey";

-- DropForeignKey
ALTER TABLE "InitiativeRelation" DROP CONSTRAINT "InitiativeRelation_toId_fkey";

-- AddForeignKey
ALTER TABLE "InitiativeRelation" ADD CONSTRAINT "InitiativeRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "InovationInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeRelation" ADD CONSTRAINT "InitiativeRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "InovationInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
