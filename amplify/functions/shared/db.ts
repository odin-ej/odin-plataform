// client/lib/db.ts
// Este arquivo gerencia a inicialização do Prisma Client, buscando a DATABASE_URL do Secrets Manager em produção.

import { PrismaClient } from "@prisma/client";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

// Declaração de um objeto global para armazenar a instância do Prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Declara a instância do Prisma fora da função de inicialização
export let prisma: PrismaClient;

/**
 * Função assíncrona para inicializar o Prisma Client.
 * Em produção, busca a DATABASE_URL do AWS Secrets Manager.
 * Em desenvolvimento, usa a variável de ambiente local.
 */
const initializePrisma = async (): Promise<PrismaClient> => {
  // Se a instância já existe (em uma invocação "quente"), retorne-a
  if (globalForPrisma.prisma) {
    console.log("Prisma Client já inicializado, reutilizando.");
    return globalForPrisma.prisma;
  }

  let databaseUrl: string | undefined; // Inicializa como undefined
  const secretName = "minha-app/prod/database-url"; // O nome EXATO do seu segredo no Secrets Manager

  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`REGION no ambiente: ${process.env.REGION}`);
  console.log(`Verificando DATABASE_URL do ambiente (dev): ${process.env.DATABASE_URL}`);

  if (process.env.NODE_ENV === "production") {
    console.log(`Ambiente de produção, tentando buscar do Secrets Manager: ${secretName}`);
   
    const client = new SecretsManagerClient({ region: process.env.REGION }); 
    const command = new GetSecretValueCommand({ SecretId: secretName });

    try {
      const response = await client.send(command);
      console.log("Resposta do Secrets Manager recebida.");
      if (response.SecretString) {
        console.log("SecretString não está vazio. Tentando parsear JSON.");
        try {
          const secret = JSON.parse(response.SecretString);
          console.log(`Secret parseado. Chaves disponíveis: ${Object.keys(secret).join(', ')}`);
          if (secret.DATABASE_URL) {
            databaseUrl = secret.DATABASE_URL;
            console.log("DATABASE_URL encontrada no segredo do Secrets Manager.");
          } else {
            console.error("Erro: SecretString parseado não contém a chave 'DATABASE_URL'. Conteúdo:", secret);
            throw new Error("SecretString parseado não contém a chave 'DATABASE_URL'.");
          }
        } catch (jsonError) {
          console.error("Erro ao parsear SecretString como JSON. Conteúdo bruto:", response.SecretString, "Erro:", jsonError);
          throw new Error("SecretString não é um JSON válido ou não contém DATABASE_URL.");
        }
      } else {
        console.error("Erro: response.SecretString está vazio.");
        throw new Error("SecretString está vazio.");
      }
    } catch (error) {
      console.error(`Erro ao buscar segredo do Secrets Manager '${secretName}':`, error);
      // Re-lança o erro para que a Lambda falhe e o problema seja visível
      throw new Error(`Falha ao carregar DATABASE_URL do Secrets Manager: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    // Em desenvolvimento, usa a variável de ambiente local DATABASE_URL
    databaseUrl = process.env.DATABASE_URL; // Remover o '!' aqui, pois é tratado pela verificação abaixo
    console.log(`Ambiente de desenvolvimento, usando DATABASE_URL do ambiente: ${databaseUrl}`);
  }

  // Verifica se a DATABASE_URL foi encontrada em qualquer um dos caminhos
  if (!databaseUrl) {
    const errorMsg = "DATABASE_URL não foi encontrada no ambiente ou no Secrets Manager.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Cria a nova instância do Prisma Client com a URL correta
  const newPrismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    // Configuração de logs do Prisma para depuração
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"], // Em produção, logar apenas erros
  });

  // Armazena a instância globalmente para reutilização
  globalForPrisma.prisma = newPrismaInstance;
  console.log("Prisma Client inicializado com sucesso.");
  return newPrismaInstance;
};

/**
 * Exporta a função que garante que o Prisma está inicializado.
 * Esta função deve ser chamada antes de qualquer operação do Prisma.
 */
export async function getPrismaClient(): Promise<PrismaClient> {
  // Só inicializa se não houver uma instância de Prisma global
  if (!globalForPrisma.prisma) { // Verifique o globalForPrisma.prisma, não a variável local 'prisma'
    prisma = await initializePrisma();
  }
  return globalForPrisma.prisma!; // Retorna a instância global
}

// Para usar em seu handler Lambda, você faria:
// import { getPrismaClient } from '../lib/db'; // Ajuste o caminho relativo
//
// export async function handler(...) {
//   const prisma = await getPrismaClient();
//   // ... suas operações do Prisma ...
// }
