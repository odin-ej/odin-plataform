// lambda-handlers/resetUserMessageLimits.ts
// Este arquivo contém o código da sua função Lambda para resetar o limite de mensagens dos usuários.

// Importa o cliente Prisma. Certifique-se de que o Prisma Client esteja
// incluído no seu pacote de deploy da Lambda (node_modules).
import { PrismaClient } from '@prisma/client';
import { Context, APIGatewayProxyResultV2 } from 'aws-lambda';

// Inicializa o cliente Prisma.
const prisma = new PrismaClient();

/**
 * Handler principal da função AWS Lambda para resetar o limite de mensagens dos usuários.
 * Esta função será invocada pelo Amazon EventBridge Scheduler.
 * Ela resetará o campo 'dailyMessageCount' para 0 para todos os usuários.
 *
 * @param event O objeto de evento da invocação Lambda. Para o Scheduler, ele pode ser vazio ou conter metadados.
 * @param context O objeto de contexto da invocação Lambda, contendo informações de runtime.
 * @returns Um objeto de resultado Lambda com statusCode e body.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handler(event: any, context: Context): Promise<APIGatewayProxyResultV2> {
  console.log('Início da execução da função Lambda para resetar limite de mensagens.');
  console.log('Evento recebido:', JSON.stringify(event, null, 2));
  console.log('Contexto da Lambda:', JSON.stringify(context, null, 2));

  try {
    // 1. Atualiza o campo 'dailyMessageCount' para 0 para todos os usuários.
    // Você pode adicionar uma condição 'where' aqui se precisar resetar apenas para usuários específicos,
    // por exemplo, 'where: { isExMember: false }' para apenas membros ativos.
    const updateResult = await prisma.user.updateMany({
      data: {
        dailyMessageCount: 0,
        lastMessageDate: new Date(), // Opcional: registrar a data da última redefinição
      },
    });

    console.log(`Sucesso! ${updateResult.count} usuários tiveram seu limite de mensagens diário resetado.`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Sucesso! ${updateResult.count} usuários tiveram seu limite de mensagens diário resetado.`,
      }),
    };

  } catch (error) {
    // Captura e loga qualquer erro que ocorra durante a execução.
    console.error("Erro na função Lambda de reset de limite de mensagens:", error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Erro interno do servidor ao resetar limite de mensagens." }),
    };
  } finally {
    // Garante que a conexão do Prisma seja desconectada após a execução da Lambda.
    await prisma.$disconnect();
  }
}