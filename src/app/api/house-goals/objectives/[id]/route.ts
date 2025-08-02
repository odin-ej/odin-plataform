import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { strategyObjectiveUpdateSchema } from "@/lib/schemas/strategyUpdateSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

    if (!hasPermission) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Validação dos dados
    const validation = strategyObjectiveUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const dataToUpdate = validation.data;
    const updatedObjective = await prisma.estrategyObjective.update({
      where: { id },
      data: dataToUpdate,
    });

    revalidatePath("/atualizar-estrategia");

    return NextResponse.json(updatedObjective);
  } catch (error) {
    console.error("Erro ao atualizar objetivo estratégico:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro no servidor." },
      { status: 500 }
    );
  }
}
