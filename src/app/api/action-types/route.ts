import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/server-utils";

const actionTypeSchema = z.object({
  name: z.string().min(3, "O nome da ação é obrigatório."),
  description: z.string().min(10, "A descrição precisa de mais detalhes."),
});

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const body = await request.json();
    const validation = actionTypeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: validation.error.formErrors },
        { status: 400 }
      );
    }

    const newActionType = await prisma.actionType.create({
      data: validation.data,
    });
    revalidatePath("/jr-points/nossa-empresa");
    return NextResponse.json(newActionType, { status: 201 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json(
      { message: "Erro ao criar tipo de ação.", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const actionTypes = await prisma.actionType.findMany();
    return NextResponse.json(actionTypes);
  } catch (error) {
    console.error("Erro ao buscar tipos de ações:", error);
    return NextResponse.json(
      { message: "Erro ao buscar tipos de ações." },
      { status: 500 }
    );
  }
}
