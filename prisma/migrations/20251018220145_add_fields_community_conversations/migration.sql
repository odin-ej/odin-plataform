/*
  Warnings:

  - You are about to drop the column `emoji` on the `MessageReaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,channelMessageId]` on the table `MessageReaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,directMessageId]` on the table `MessageReaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdById` to the `DirectConversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customEmojiId` to the `MessageReaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "MessageReaction_userId_channelMessageId_emoji_key";

-- DropIndex
DROP INDEX "MessageReaction_userId_directMessageId_emoji_key";

-- AlterTable
ALTER TABLE "DirectConversation" ADD COLUMN     "createdById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MessageReaction" DROP COLUMN "emoji",
ADD COLUMN     "customEmojiId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CustomEmoji" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomEmoji_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomEmoji_name_key" ON "CustomEmoji"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_userId_channelMessageId_key" ON "MessageReaction"("userId", "channelMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_userId_directMessageId_key" ON "MessageReaction"("userId", "directMessageId");

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_customEmojiId_fkey" FOREIGN KEY ("customEmojiId") REFERENCES "CustomEmoji"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomEmoji" ADD CONSTRAINT "CustomEmoji_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectConversation" ADD CONSTRAINT "DirectConversation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
