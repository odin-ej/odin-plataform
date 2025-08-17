import { prisma } from "@/db";
import { TaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// Esta função é projetada para ser chamada por um serviço automatizado (Cron Job).
export async function GET(request: Request) {
  try {
    // 1. Segurança: Protege a rota com um "segredo".
    // Isso impede que qualquer pessoa execute esta função, exceto o seu serviço de Cron.
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { message: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    const now = new Date();

    // 2. Encontra todas as tarefas que estão "EM PROGRESSO" e cujo prazo já passou.
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: TaskStatus.IN_PROGRESS, // Apenas tarefas que ainda estão ativas
        deadline: {
          lt: now, // "lt" (less than) - o prazo é menor que (anterior a) agora.
        },
      },
      select: {
        id: true, // Seleciona apenas os IDs para ser mais eficiente.
        responsibles: true,
        authorId: true,
      },
    });

    const notification = await prisma.notification.create({
      data: {
        link: `/minhas-pendencias`,
        notification: `Existem ${overdueTasks.length} tarefas atrasadas.`,
        type: "NEW_MENTION",
      },
    });

    const membersToNotify = [
      ...overdueTasks.map((task) => task.authorId),
      ...overdueTasks.map((task) => task.responsibles.map((user) => user.id)),
    ].filter(Boolean) as string[];

    await prisma.notificationUser.createMany({
      data: membersToNotify.map((userId) => ({
        notificationId: notification.id,
        userId,
      })),
    });

    // Se não houver tarefas atrasadas, termina a execução.
    if (overdueTasks.length === 0) {
      return NextResponse.json({
        message: "Nenhuma tarefa atrasada encontrada.",
      });
    }

    const overdueTaskIds = overdueTasks.map((task) => task.id);
    await prisma.$connect();
    // 3. Atualiza todas as tarefas encontradas para "PENDENTE" em uma única operação.
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

    revalidatePath("/tarefas");
    revalidatePath("/");
    revalidatePath("/minhas-pendencias");
    console.log(
      `Cron Job: ${updateResult.count} tarefas foram atualizadas para PENDENTE.`
    );
    return NextResponse.json({
      message: `Sucesso! ${updateResult.count} tarefas foram atualizadas.`,
      updatedIds: overdueTaskIds,
    });
  } catch (error) {
    console.error("Erro no Cron Job de atualização de tarefas:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
