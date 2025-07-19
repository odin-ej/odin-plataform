import { PrismaClient } from '.prisma/client';
// Declara uma variável global para guardar a instância do Prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Verifica se já existe uma instância. Se não, cria uma nova.
// Em desenvolvimento, o `globalThis` persiste entre as recargas,
// evitando que novas instâncias sejam criadas.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;