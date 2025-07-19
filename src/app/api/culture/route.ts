import { prisma } from "@/db";
import { cultureUpdateSchema } from "@/lib/schemas/strategyUpdateSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const estrategyPlan = await prisma.estrategyPlan.findMany({
      include: {
        values: true,
        estrategyObjectives: true,
      },
    });
    return NextResponse.json(estrategyPlan);
  } catch (error) {
    console.error("Erro ao buscar culturas:", error);
    return NextResponse.json(
      { message: "Erro ao buscar culturas." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  // Adicione aqui a lógica para verificar se o usuário tem permissão para editar a cultura

  try {
    const body = await request.json();
    const validation = cultureUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const updatedCulture = await prisma.estrategyPlan.update({
      where: { id: 1 },
      data: validation.data,
    });

    revalidatePath("/atualizar-estrategia");
    return NextResponse.json(updatedCulture);
  } catch (error) {
    return NextResponse.json(
      { error: `Erro ao atualizar estratégia: ${error}` },
      { status: 500 }
    );
  }
}
