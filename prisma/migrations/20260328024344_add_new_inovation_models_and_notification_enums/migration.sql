-- CreateEnum
CREATE TYPE "IdeaCategory" AS ENUM ('PROCESSO', 'PRODUTO', 'TECNOLOGIA', 'CULTURA', 'OUTRO');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ARCHIVED', 'IMPLEMENTED');

-- CreateEnum
CREATE TYPE "IdeaType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ROOM_RESERVATION';
ALTER TYPE "NotificationType" ADD VALUE 'ITEM_RESERVATION';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'INITIATIVE_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'INITIATIVE_REVIEWED';
ALTER TYPE "NotificationType" ADD VALUE 'RECOGNITION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'MEMBER_REGISTERED';
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_INCOMPLETE';
ALTER TYPE "NotificationType" ADD VALUE 'FEED_INTERACTION';
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM_ANNOUNCEMENT';

-- CreateTable
CREATE TABLE "InovationIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "IdeaCategory" NOT NULL,
    "status" "IdeaStatus" NOT NULL DEFAULT 'SUBMITTED',
    "ideaType" "IdeaType" NOT NULL DEFAULT 'INTERNAL',
    "authorId" TEXT NOT NULL,
    "tags" TEXT[],
    "problemDescription" TEXT,
    "targetAudience" TEXT,
    "partners" TEXT,
    "resources" TEXT[],
    "smartSpecific" INTEGER NOT NULL DEFAULT 3,
    "smartMeasurable" INTEGER NOT NULL DEFAULT 3,
    "smartAchievable" INTEGER NOT NULL DEFAULT 3,
    "smartRelevant" INTEGER NOT NULL DEFAULT 3,
    "smartTimeBound" INTEGER NOT NULL DEFAULT 3,
    "smartSpecificText" TEXT,
    "smartMeasurableText" TEXT,
    "smartAchievableText" TEXT,
    "smartRelevantText" TEXT,
    "smartTimeBoundText" TEXT,
    "clusterLevel" INTEGER NOT NULL DEFAULT 1,
    "priorityScore" INTEGER NOT NULL DEFAULT 0,
    "implementedAsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InovationIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaVote" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InovationIdea_authorId_idx" ON "InovationIdea"("authorId");

-- CreateIndex
CREATE INDEX "InovationIdea_status_idx" ON "InovationIdea"("status");

-- CreateIndex
CREATE INDEX "InovationIdea_priorityScore_idx" ON "InovationIdea"("priorityScore" DESC);

-- CreateIndex
CREATE INDEX "IdeaVote_ideaId_idx" ON "IdeaVote"("ideaId");

-- CreateIndex
CREATE INDEX "IdeaVote_userId_idx" ON "IdeaVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaVote_ideaId_userId_key" ON "IdeaVote"("ideaId", "userId");

-- AddForeignKey
ALTER TABLE "InovationIdea" ADD CONSTRAINT "InovationIdea_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InovationIdea" ADD CONSTRAINT "InovationIdea_implementedAsId_fkey" FOREIGN KEY ("implementedAsId") REFERENCES "InovationInitiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaVote" ADD CONSTRAINT "IdeaVote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "InovationIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaVote" ADD CONSTRAINT "IdeaVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
