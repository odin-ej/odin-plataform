/*
  Warnings:

  - You are about to drop the column `links` on the `InovationInitiative` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InovationInitiative" DROP COLUMN "links",
ADD COLUMN     "isFixed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "initiativeId" TEXT NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "InovationInitiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
