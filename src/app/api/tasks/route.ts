import { prisma } from "@/db";
import { getTasksWhereClauseForUser } from "@/lib/permissions";
import { taskCreateSchema } from "@/lib/schemas/projectsAreaSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { parseBrazilianDate } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const whereClause = getTasksWhereClauseForUser(authUser);

  
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        responsibles: true,
        author: true,
      },
      orderBy: {
        deadline: "asc",
      },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error);
    return NextResponse.json(
      { message: "Erro ao buscar tarefas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = taskCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { responsibles, deadline, ...taskData } = validation.data;

    const parsedDeadline: string | Date =
      typeof deadline! === "string"
        ? (parseBrazilianDate(deadline) as Date)
        : "";

    const dataForPrisma = {
      ...taskData,
      deadline: parsedDeadline,
      authorId: authUser.id,
      responsibles: {
        // Transforma o array de IDs no formato que o Prisma espera para criar relações.
        connect: responsibles.map((id) => ({ id })),
      },
    };

    const newTask = await prisma.task.create({ data: dataForPrisma });
    revalidatePath("/tarefas");
    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    return NextResponse.json(
      { message: "Erro ao criar tarefa." },
      { status: 500 }
    );
  }
}
