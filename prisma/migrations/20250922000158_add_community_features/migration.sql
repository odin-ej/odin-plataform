-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "allowExMembers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phraseStatus" TEXT;

-- CreateTable
CREATE TABLE "_ChannelMessageToFileAttachment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChannelMessageToFileAttachment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ChannelMessageToFileAttachment_B_index" ON "_ChannelMessageToFileAttachment"("B");

-- AddForeignKey
ALTER TABLE "_ChannelMessageToFileAttachment" ADD CONSTRAINT "_ChannelMessageToFileAttachment_A_fkey" FOREIGN KEY ("A") REFERENCES "ChannelMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChannelMessageToFileAttachment" ADD CONSTRAINT "_ChannelMessageToFileAttachment_B_fkey" FOREIGN KEY ("B") REFERENCES "FileAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
