// /amplify/functions/actionTypeHandler/lib/db.ts
import { PrismaClient } from ".prisma/client";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Declara a instância do Prisma fora da função de inicialização
export let prisma: PrismaClient;

// Função assíncrona para inicializar o Prisma
const initializePrisma = async () => {
  // Se a instância já existe (em uma invocação "quente"), retorne-a
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  let databaseUrl: string;

  // Em produção, busca a URL do banco do Secrets Manager
  if (process.env.NODE_ENV === "production") {
    const secretName = "minha-app/prod/database-url"; // O nome do seu segredo
    const client = new SecretsManagerClient({ region: process.env.REGION });
    const command = new GetSecretValueCommand({ SecretId: secretName });

    try {
      const response = await client.send(command);
      if (response.SecretString) {
        const secret = JSON.parse(response.SecretString);
        databaseUrl = secret.DATABASE_URL;
      } else {
        throw new Error("SecretString está vazio.");
      }
    } catch (error) {
      console.error("Erro ao buscar a DATABASE_URL do Secrets Manager:", error);
      throw error;
    }
  } else {
    // Em desenvolvimento, usa a variável de ambiente local
    databaseUrl = process.env.DATABASE_URL!;
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não foi encontrada.");
  }

  // Cria a nova instância com a URL correta
  const newPrismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  globalForPrisma.prisma = newPrismaInstance;
  return newPrismaInstance;
};

// Exporta a função que garante que o Prisma está inicializado
export async function getPrismaClient() {
  if (!prisma) {
    prisma = await initializePrisma();
  }
  return prisma;
}

// Para uso no seu handler, você faria:
// const prisma = await getPrismaClient();
// await prisma.user.findMany(...);
