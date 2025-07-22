import { PrismaClient } from "@prisma/client";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export let prisma: PrismaClient;

const initializePrisma = async (): Promise<PrismaClient> => {
  if (globalForPrisma.prisma) {
    console.log("✅ Prisma já inicializado.");
    return globalForPrisma.prisma;
  }

  const secretName = "minha-app/prod/database-url";
  const region = process.env.REGION;

  if (!region) {
    throw new Error("❌ A variável de ambiente REGION não está definida.");
  }

  const client = new SecretsManagerClient({ region });
  const command = new GetSecretValueCommand({ SecretId: secretName });

  let databaseUrl: string;

  try {
    const response = await client.send(command);
    if (!response.SecretString) {
      throw new Error("❌ SecretString retornado está vazio.");
    }

    const secret = JSON.parse(response.SecretString);
    if (!secret.username || !secret.password || !secret.host || !secret.port) {
      throw new Error("❌ Informações de conexão incompletas no segredo.");
    }

    databaseUrl = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/postgres`;
  } catch (error) {
    console.error("❌ Erro ao buscar DATABASE_URL:", error);
    throw error;
  }

  const newPrismaInstance = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
    log: ["error"], // só loga erros em produção
  });

  globalForPrisma.prisma = newPrismaInstance;
  console.log("✅ Prisma Client inicializado com sucesso.");
  return newPrismaInstance;
};

export async function getPrismaClient(): Promise<PrismaClient> {
  if (!globalForPrisma.prisma) {
    prisma = await initializePrisma();
  }
  return globalForPrisma.prisma!;
}
