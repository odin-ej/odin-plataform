/*
  Warnings:

  - You are about to drop the column `url` on the `OraculoFile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key]` on the table `OraculoFile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `OraculoFile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OraculoFile" DROP COLUMN "url",
ADD COLUMN     "key" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OraculoFile_key_key" ON "OraculoFile"("key");
