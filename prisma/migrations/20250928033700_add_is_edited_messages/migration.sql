-- AlterTable
ALTER TABLE "ChannelMessage" ADD COLUMN     "is_edited" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DirectConversation" ADD COLUMN     "is_edited" BOOLEAN NOT NULL DEFAULT false;
