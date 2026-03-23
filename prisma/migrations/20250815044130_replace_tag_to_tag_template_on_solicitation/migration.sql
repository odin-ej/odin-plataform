/*
  Warnings:

  - You are about to drop the `_SolicitationTags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_SolicitationTags" DROP CONSTRAINT "_SolicitationTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_SolicitationTags" DROP CONSTRAINT "_SolicitationTags_B_fkey";

-- DropTable
DROP TABLE "_SolicitationTags";

-- CreateTable
CREATE TABLE "_SolicitationTagTemplates" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SolicitationTagTemplates_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SolicitationTagTemplates_B_index" ON "_SolicitationTagTemplates"("B");

-- AddForeignKey
ALTER TABLE "_SolicitationTagTemplates" ADD CONSTRAINT "_SolicitationTagTemplates_A_fkey" FOREIGN KEY ("A") REFERENCES "JRPointsSolicitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SolicitationTagTemplates" ADD CONSTRAINT "_SolicitationTagTemplates_B_fkey" FOREIGN KEY ("B") REFERENCES "TagTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
