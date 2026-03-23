/*
  Warnings:

  - You are about to drop the column `userId` on the `Task` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "JRPointsSolicitationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JRPointsReportStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('POINTS_AWARDED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'NEW_MENTION', 'GENERAL_ALERT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AreaRoles" ADD VALUE 'MARKETING';
ALTER TYPE "AreaRoles" ADD VALUE 'COMERCIAL';
ALTER TYPE "AreaRoles" ADD VALUE 'ADMINISTRATIVO_FINANCEIRO';

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_userId_fkey";

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "recipientNotes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "isFromAppeal" BOOLEAN DEFAULT false,
ADD COLUMN     "templateId" TEXT;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "UserRoleHistory" (
    "id" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRoleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSemesterScore" (
    "id" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserSemesterScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JRPointsVersion" (
    "id" TEXT NOT NULL,
    "versionName" TEXT NOT NULL,
    "description" TEXT,
    "implementationDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JRPointsVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseValue" INTEGER NOT NULL,
    "isScalable" BOOLEAN DEFAULT false,
    "escalationValue" DOUBLE PRECISION,
    "escalationStreakDays" INTEGER,
    "escalationCondition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actionTypeId" TEXT NOT NULL,
    "jrPointsVersionId" TEXT,
    "areas" "TagAreas"[] DEFAULT ARRAY['GERAL']::"TagAreas"[],

    CONSTRAINT "TagTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAttachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jrPointsSolicitationId" TEXT,
    "postId" TEXT,

    CONSTRAINT "FileAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JRPointsSolicitation" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "datePerformed" TEXT NOT NULL,
    "directorsNotes" TEXT,
    "status" "JRPointsSolicitationStatus" NOT NULL DEFAULT 'PENDING',
    "area" "AreaRoles" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "JRPointsSolicitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JRPointsReport" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "JRPointsReportStatus" NOT NULL DEFAULT 'DRAFT',
    "area" "AreaRoles" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "JRPointsReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReserveRequestToConections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ReserveRequestToConections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "notification" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isRead" BOOLEAN DEFAULT false,
    "type" "NotificationType",
    "link" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isFixed" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostsLayout" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostsLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VersionActionTypes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VersionActionTypes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SolicitationMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SolicitationMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SolicitationTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SolicitationTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PostLikes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostLikes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_LayoutPosts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LayoutPosts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CommentLikes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CommentLikes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "UserRoleHistory_userId_idx" ON "UserRoleHistory"("userId");

-- CreateIndex
CREATE INDEX "UserRoleHistory_roleId_idx" ON "UserRoleHistory"("roleId");

-- CreateIndex
CREATE INDEX "UserSemesterScore_userId_semester_idx" ON "UserSemesterScore"("userId", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "JRPointsVersion_versionName_key" ON "JRPointsVersion"("versionName");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "_VersionActionTypes_B_index" ON "_VersionActionTypes"("B");

-- CreateIndex
CREATE INDEX "_SolicitationMembers_B_index" ON "_SolicitationMembers"("B");

-- CreateIndex
CREATE INDEX "_SolicitationTags_B_index" ON "_SolicitationTags"("B");

-- CreateIndex
CREATE INDEX "_PostLikes_B_index" ON "_PostLikes"("B");

-- CreateIndex
CREATE INDEX "_LayoutPosts_B_index" ON "_LayoutPosts"("B");

-- CreateIndex
CREATE INDEX "_CommentLikes_B_index" ON "_CommentLikes"("B");

-- AddForeignKey
ALTER TABLE "UserRoleHistory" ADD CONSTRAINT "UserRoleHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleHistory" ADD CONSTRAINT "UserRoleHistory_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSemesterScore" ADD CONSTRAINT "UserSemesterScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagTemplate" ADD CONSTRAINT "TagTemplate_actionTypeId_fkey" FOREIGN KEY ("actionTypeId") REFERENCES "ActionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagTemplate" ADD CONSTRAINT "TagTemplate_jrPointsVersionId_fkey" FOREIGN KEY ("jrPointsVersionId") REFERENCES "JRPointsVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TagTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_jrPointsSolicitationId_fkey" FOREIGN KEY ("jrPointsSolicitationId") REFERENCES "JRPointsSolicitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsSolicitation" ADD CONSTRAINT "JRPointsSolicitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JRPointsReport" ADD CONSTRAINT "JRPointsReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReserveRequestToConections" ADD CONSTRAINT "ReserveRequestToConections_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReserveRequestToConections" ADD CONSTRAINT "ReserveRequestToConections_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "_VersionActionTypes" ADD CONSTRAINT "_VersionActionTypes_A_fkey" FOREIGN KEY ("A") REFERENCES "ActionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VersionActionTypes" ADD CONSTRAINT "_VersionActionTypes_B_fkey" FOREIGN KEY ("B") REFERENCES "JRPointsVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SolicitationMembers" ADD CONSTRAINT "_SolicitationMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "JRPointsSolicitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SolicitationMembers" ADD CONSTRAINT "_SolicitationMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SolicitationTags" ADD CONSTRAINT "_SolicitationTags_A_fkey" FOREIGN KEY ("A") REFERENCES "JRPointsSolicitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SolicitationTags" ADD CONSTRAINT "_SolicitationTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostLikes" ADD CONSTRAINT "_PostLikes_A_fkey" FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostLikes" ADD CONSTRAINT "_PostLikes_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LayoutPosts" ADD CONSTRAINT "_LayoutPosts_A_fkey" FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LayoutPosts" ADD CONSTRAINT "_LayoutPosts_B_fkey" FOREIGN KEY ("B") REFERENCES "PostsLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommentLikes" ADD CONSTRAINT "_CommentLikes_A_fkey" FOREIGN KEY ("A") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommentLikes" ADD CONSTRAINT "_CommentLikes_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
