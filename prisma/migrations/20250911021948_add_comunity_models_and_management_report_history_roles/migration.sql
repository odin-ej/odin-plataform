/*
  Warnings:

  - You are about to drop the column `title` on the `Post` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('ORIGINAL', 'REPOST', 'QUOTE');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'DIRECT');

-- CreateEnum
CREATE TYPE "ChannelMemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "FileAttachment" ADD COLUMN     "directMessageId" TEXT;

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "title",
ADD COLUMN     "originalPostId" TEXT,
ADD COLUMN     "type" "PostType" NOT NULL DEFAULT 'ORIGINAL';

-- AlterTable
ALTER TABLE "UserRoleHistory" ADD COLUMN     "managementReportId" TEXT;

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ChannelType" NOT NULL DEFAULT 'PUBLIC',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "restrictedToAreas" "AreaRoles"[],

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelMember" (
    "id" TEXT NOT NULL,
    "role" "ChannelMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "ChannelMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "ChannelMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectConversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PostFavorites" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostFavorites_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PostReposts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostReposts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DirectConversationParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DirectConversationParticipants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "ChannelMember_userId_idx" ON "ChannelMember"("userId");

-- CreateIndex
CREATE INDEX "ChannelMember_channelId_idx" ON "ChannelMember"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelMember_userId_channelId_key" ON "ChannelMember"("userId", "channelId");

-- CreateIndex
CREATE INDEX "ChannelMessage_channelId_idx" ON "ChannelMessage"("channelId");

-- CreateIndex
CREATE INDEX "ChannelMessage_authorId_idx" ON "ChannelMessage"("authorId");

-- CreateIndex
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_userId_messageId_emoji_key" ON "MessageReaction"("userId", "messageId", "emoji");

-- CreateIndex
CREATE INDEX "DirectConversation_updatedAt_idx" ON "DirectConversation"("updatedAt");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_idx" ON "DirectMessage"("conversationId");

-- CreateIndex
CREATE INDEX "_PostFavorites_B_index" ON "_PostFavorites"("B");

-- CreateIndex
CREATE INDEX "_PostReposts_B_index" ON "_PostReposts"("B");

-- CreateIndex
CREATE INDEX "_DirectConversationParticipants_B_index" ON "_DirectConversationParticipants"("B");

-- CreateIndex
CREATE INDEX "Post_originalPostId_idx" ON "Post"("originalPostId");

-- AddForeignKey
ALTER TABLE "UserRoleHistory" ADD CONSTRAINT "UserRoleHistory_managementReportId_fkey" FOREIGN KEY ("managementReportId") REFERENCES "FileAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_directMessageId_fkey" FOREIGN KEY ("directMessageId") REFERENCES "DirectMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_originalPostId_fkey" FOREIGN KEY ("originalPostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ChannelMember" ADD CONSTRAINT "ChannelMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMember" ADD CONSTRAINT "ChannelMember_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChannelMessage"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChannelMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DirectConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostFavorites" ADD CONSTRAINT "_PostFavorites_A_fkey" FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostFavorites" ADD CONSTRAINT "_PostFavorites_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostReposts" ADD CONSTRAINT "_PostReposts_A_fkey" FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostReposts" ADD CONSTRAINT "_PostReposts_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DirectConversationParticipants" ADD CONSTRAINT "_DirectConversationParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "DirectConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DirectConversationParticipants" ADD CONSTRAINT "_DirectConversationParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
