-- CreateEnum
CREATE TYPE "TagAreas" AS ENUM ('PRESIDENCIA', 'OPERACOES', 'PESSOAS', 'PROJETOS', 'MERCADO', 'GERAL');

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "area" "TagAreas"[] DEFAULT ARRAY['GERAL']::"TagAreas"[],
ADD COLUMN     "assignerId" TEXT;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_assignerId_fkey" FOREIGN KEY ("assignerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
