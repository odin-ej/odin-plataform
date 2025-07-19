// lambda-handlers/updateOverdueTasks.ts
// Este arquivo contém o código da sua função Lambda para atualizar tarefas atrasadas.

// Importa o cliente Prisma. Certifique-se de que o Prisma Client esteja
// incluído no seu pacote de deploy da Lambda (node_modules).
// Você precisará ter o Prisma Client gerado para o seu schema.prisma.
import { PrismaClient, TaskStatus } from '@prisma/client';

// Importa os tipos para o evento Lambda e o contexto.
// O 'event' para um agendamento do EventBridge Scheduler pode ser um objeto vazio ou com metadados.
// O 'context' contém informações de runtime da Lambda.
import { Context, APIGatewayProxyResultV2 } from 'aws-lambda';

// Inicializa o cliente Prisma.
// É uma boa prática inicializar fora do handler para que ele possa ser reutilizado
// em invocações quentes (warm invocations) da Lambda, evitando a sobrecarga de conexão.
// A DATABASE_URL será lida da variável de ambiente da Lambda.
const prisma = new PrismaClient();

/**
 * Handler principal da função AWS Lambda para atualizar tarefas atrasadas.
 * Esta função será invocada pelo Amazon EventBridge Scheduler.
 *
 * @param event O objeto de evento da invocação Lambda. Para o Scheduler, ele pode ser vazio ou conter metadados.
 * @param context O objeto de contexto da invocação Lambda, contendo informações de runtime.
 * @returns Um objeto de resultado Lambda com statusCode e body.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handler(event: any, context: Context): Promise<APIGatewayProxyResultV2> {
  console.log('Início da execução da função Lambda para atualizar tarefas atrasadas.');
  console.log('Evento recebido:', JSON.stringify(event, null, 2));
  console.log('Contexto da Lambda:', JSON.stringify(context, null, 2));

  try {
    // A lógica de segurança com CRON_SECRET é removida aqui.
    // A segurança é garantida pelas permissões IAM do EventBridge Scheduler para invocar esta Lambda.

    const now = new Date();

    // 1. Encontra todas as tarefas que estão "EM PROGRESSO" e cujo prazo já passou.
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: TaskStatus.IN_PROGRESS, // Apenas tarefas que ainda estão ativas
        deadline: {
          lt: now, // "lt" (less than) - o prazo é menor que (anterior a) agora.
        },
      },
      select: {
        id: true, // Seleciona apenas os IDs para ser mais eficiente.
      },
    });

    // Se não houver tarefas atrasadas, termina a execução com sucesso.
    if (overdueTasks.length === 0) {
      console.log('Nenhuma tarefa atrasada encontrada para atualização.');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Nenhuma tarefa atrasada encontrada.' }),
      };
    }

    const overdueTaskIds = overdueTasks.map(task => task.id);

    // 2. Atualiza todas as tarefas encontradas para "PENDENTE" em uma única operação.
    const updateResult = await prisma.task.updateMany({
      where: {
        id: {
          in: overdueTaskIds,
        },
      },
      data: {
        status: TaskStatus.PENDING, // Define o novo status
      },
    });

    // As chamadas revalidatePath são removidas, pois são específicas do Next.js.
    // Se a revalidação for necessária, ela deve ser tratada de outra forma (ex: API de revalidação no Next.js).
    console.log(`Sucesso! ${updateResult.count} tarefas foram atualizadas para PENDENTE.`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Sucesso! ${updateResult.count} tarefas foram atualizadas.`,
        updatedIds: overdueTaskIds,
      }),
    };

  } catch (error) {
    // Captura e loga qualquer erro que ocorra durante a execução.
    console.error("Erro na função Lambda de atualização de tarefas atrasadas:", error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Erro interno do servidor ao atualizar tarefas." }),
    };
  } finally {
    // Garante que a conexão do Prisma seja desconectada após a execução da Lambda.
    // Isso é importante para evitar que a Lambda fique "presa" ou cause vazamento de conexões.
    await prisma.$disconnect();
  }
}