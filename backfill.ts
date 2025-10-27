// backfill.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando backfill das tags de solicitações...');

  const solicitations = await prisma.jRPointsSolicitation.findMany({
    include: {
      tags: { select: { id: true } }, // Pega as tags pela RELAÇÃO ANTIGA
    },
  });

  let count = 0;
  for (const sol of solicitations) {
    if (sol.tags.length > 0) {
      // Cria uma entrada na NOVA tabela para cada link da tabela ANTIGA
      await prisma.solicitationTag.createMany({
        data: sol.tags.map(tag => ({
          solicitationId: sol.id,
          tagTemplateId: tag.id,
        })),
        skipDuplicates: true, // Evita erros caso o script rode 2x
      });
      count += sol.tags.length;
    }
  }
  console.log(`Backfill completo! ${count} links de tags migrados.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());