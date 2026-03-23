/*
  Warnings:

  - You are about to drop the column `area` on the `Tag` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "area",
ADD COLUMN     "areas" "TagAreas"[] DEFAULT ARRAY['GERAL']::"TagAreas"[];
