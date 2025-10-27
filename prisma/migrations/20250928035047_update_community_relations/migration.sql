/*
  Warnings:

  - You are about to drop the column `is_edited` on the `DirectConversation` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `MessageReaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,channelMessageId,emoji]` on the table `MessageReaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,directMessageId,emoji]` on the table `MessageReaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "MessageReaction" DROP CONSTRAINT "MessageReaction_messageId_fkey";

-- DropIndex
DROP INDEX "MessageReaction_messageId_idx";

-- DropIndex
DROP INDEX "MessageReaction_userId_messageId_emoji_key";

-- AlterTable
ALTER TABLE "DirectConversation" DROP COLUMN "is_edited";

-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "is_edited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "MessageReaction" DROP COLUMN "messageId",
ADD COLUMN     "channelMessageId" TEXT,
ADD COLUMN     "directMessageId" TEXT;

-- CreateIndex
CREATE INDEX "MessageReaction_directMessageId_channelMessageId_idx" ON "MessageReaction"("directMessageId", "channelMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_userId_channelMessageId_emoji_key" ON "MessageReaction"("userId", "channelMessageId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_userId_directMessageId_emoji_key" ON "MessageReaction"("userId", "directMessageId", "emoji");

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_channelMessageId_fkey" FOREIGN KEY ("channelMessageId") REFERENCES "ChannelMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_directMessageId_fkey" FOREIGN KEY ("directMessageId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DirectMessage"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
