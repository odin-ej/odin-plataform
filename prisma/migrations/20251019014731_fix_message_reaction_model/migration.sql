/*
  Warnings:

  - A unique constraint covering the columns `[userId,channelMessageId,customEmojiId]` on the table `MessageReaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,directMessageId,customEmojiId]` on the table `MessageReaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "MessageReaction" DROP CONSTRAINT "MessageReaction_customEmojiId_fkey";

-- DropIndex
DROP INDEX "MessageReaction_userId_channelMessageId_key";

-- DropIndex
DROP INDEX "MessageReaction_userId_directMessageId_key";

-- AlterTable
ALTER TABLE "MessageReaction" ADD COLUMN     "emoji" TEXT,
ALTER COLUMN "customEmojiId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_userId_channelMessageId_customEmojiId_key" ON "MessageReaction"("userId", "channelMessageId", "customEmojiId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_userId_directMessageId_customEmojiId_key" ON "MessageReaction"("userId", "directMessageId", "customEmojiId");

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_customEmojiId_fkey" FOREIGN KEY ("customEmojiId") REFERENCES "CustomEmoji"("id") ON DELETE SET NULL ON UPDATE CASCADE;
