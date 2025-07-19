// lambda-handlers/cleanupConversations.ts
// Este arquivo contém o código da sua função Lambda para apagar conversas antigas.

// Importa o cliente Prisma. Certifique-se de que o Prisma Client esteja
// incluído no seu pacote de deploy da Lambda (node_modules).
import { PrismaClient } from '@prisma/client';
import { Context, APIGatewayProxyResultV2 } from 'aws-lambda';

// Inicializa o cliente Prisma.
const prisma = new PrismaClient();

/**
 * Handler principal da função AWS Lambda para apagar conversas antigas.
 * Esta função será invocada pelo Amazon EventBridge Scheduler.
 * Ela deletará conversas criadas há mais de 30 dias.
 *
 * @param event O objeto de evento da invocação Lambda. Para o Scheduler, ele pode ser vazio ou conter metadados.
 * @param context O objeto de contexto da invocação Lambda, contendo informações de runtime.
 * @returns Um objeto de resultado Lambda com statusCode e body.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handler(event: any, context: Context): Promise<APIGatewayProxyResultV2> {
  console.log('Início da execução da função Lambda para apagar conversas antigas.');
  console.log('Evento recebido:', JSON.stringify(event, null, 2));
  console.log('Contexto da Lambda:', JSON.stringify(context, null, 2));

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Deleta todas as conversas criadas há mais de 30 dias.
    const result = await prisma.conversation.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
    });

    const message = `${result.count} conversas antigas foram apagadas.`;
    console.log(message);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    };

  } catch (error) {
    console.error("Erro na função Lambda para apagar conversas antigas:", error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Erro interno do servidor ao apagar conversas antigas." }),
    };
  } finally {
    // Garante que a conexão do Prisma seja desconectada após a execução da Lambda.
    await prisma.$disconnect();
  }
}