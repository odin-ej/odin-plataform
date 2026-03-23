import { taskUpdateSchema } from "@/lib/schemas/projectsAreaSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { parseBrazilianDate } from "@/lib/utils";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const validation = taskUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: validation.error.formErrors },
        { status: 400 }
      );
    }

    const { deadline, responsibles, ...data } = validation.data;

    const parsedDeadline =
      typeof deadline === "string" ? parseBrazilianDate(deadline) : null;

    const dataForPrisma: Prisma.TaskUpdateInput = {
      ...data,
      deadline: parsedDeadline as Date,
    };

    if (responsibles) {
      dataForPrisma.responsibles = {
        set: responsibles.map((userId) => ({ id: userId })),
      };
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: dataForPrisma,
      include: { responsibles: true },
    });

    const notification = await prisma.notification.create({
      data: {
        link: `/tarefas`,
        type: "NEW_MENTION",
        notification: `A tarefa: ${updatedTask.title} foi atualizada por ${authUser.name.split(" ")[0]}.`,
      },
    });

    await prisma.notificationUser.createMany({
      data: updatedTask.responsibles.map((user) => ({
        notificationId: notification.id,
        userId: user.id,
      })),
    });

    revalidatePath("/tarefas");
    return NextResponse.json(updatedTask);
  } catch (error) {
    return NextResponse.json(
      { message: `Houve um erro ao atualizar a task: ${error}.` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const taskToDelete = await prisma.task.delete({
      where: { id },
      include: { responsibles: true },
    });
    const notification = await prisma.notification.create({
      data: {
        link: `/minhas-pendencias`,
        type: "NEW_MENTION",
        notification: `A tarefa: ${taskToDelete.title} foi apagada por ${authUser.name.split(" ")[0]}.`,
      },
    });

    await prisma.notificationUser.createMany({
      data: taskToDelete.responsibles.map((user) => ({
        notificationId: notification.id,
        userId: user.id,
      })),
    });

    revalidatePath("/tarefas");
    return NextResponse.json({ status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: "Houve um erro ao apagar a task.", error },
      { status: 500 }
    );
  }
}
