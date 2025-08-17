import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import z from "zod";

const semesterToggleSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive } = semesterToggleSchema.parse(body);

    if (isActive) {
      // Usa uma transação para garantir que a operação seja atômica
      // 1. Desativa todos os outros semestres
      // 2. Ativa o semestre selecionado
      await prisma.$transaction([
        prisma.semester.updateMany({
          where: {
            NOT: { id: id },
          },
          data: { isActive: false },
        }),
        prisma.semester.update({
          where: { id },
          data: { isActive: true },
        }),
      ]);
    } else {
      // Se estiver desativando, apenas atualiza o selecionado
      await prisma.semester.update({
        where: { id },
        data: { isActive: false },
      });
    }

    // Invalida o cache para que as páginas que exibem os dados sejam atualizadas
    revalidatePath("/gerenciar-jr-points");

    return NextResponse.json({ message: "Status do semestre atualizado com sucesso." });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dados inválidos.", errors: error.flatten() }, { status: 400 });
    }
    console.error("[SEMESTER_TOGGLE_ERROR]", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.semester.delete({ where: { id } });

    // Invalida o cache para que as páginas que exibem os dados sejam atualizadas
    revalidatePath("/gerenciar-jr-points");

    return NextResponse.json({ message: "Semestre excluído com sucesso." });

  } catch (error) {
    console.error("[DELETE_SEMESTER_ERROR]", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}