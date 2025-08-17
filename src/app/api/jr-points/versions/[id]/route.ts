// /app/api/jr-points/versions/[id]/route.ts

import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

const toggleSchema = z.object({ isActive: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    const isDirector = checkUserPermission(authUser, DIRECTORS_ONLY);
    if (!isDirector)
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { isActive } = toggleSchema.parse(body);

    if (isActive) {
      await prisma.$transaction([
        prisma.jRPointsVersion.updateMany({
          where: { NOT: { id } },
          data: { isActive: false },
        }),
        prisma.jRPointsVersion.update({
          where: { id },
          data: { isActive: true },
        }),
      ]);
    } else {
      await prisma.jRPointsVersion.update({
        where: { id },
        data: { isActive: false },
      });
    }
    revalidatePath("/gerenciar-jr-points");
    return NextResponse.json({ message: "Status da versão atualizado." });
  } catch (error) {
    if (error instanceof z.ZodError)
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    console.error("[VERSION_TOGGLE_ERROR]", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY))
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });

    const { id } = await params;

    const version = await prisma.jRPointsVersion.findUnique({
      where: { id },
    });

    if (!version) {
      return NextResponse.json(
        { message: "Versão não encontrada." },
        { status: 404 }
      );
    }

    await prisma.jRPointsSolicitation.deleteMany({
      where: { jrPointsVersionId: id },
    });

    await prisma.jRPointsReport.deleteMany({
      where: { jrPointsVersionId: id },
    });

    await prisma.tagTemplate.deleteMany({
      where: { jrPointsVersionId: id },
    });

    // Remove a relação da tabela intermediária com os ActionTypes
    await prisma.jRPointsVersion.update({
      where: { id },
      data: {
        actionTypes: {
          set: [], // remove todos os relacionamentos da tabela many-to-many
        },
      },
    });

    await prisma.jRPointsVersion.delete({ where: { id } });

    // Invalida o cache para que as páginas que exibem os dados sejam atualizadas
    revalidatePath("/gerenciar-jr-points");

    return NextResponse.json({ message: "Versão excluída com sucesso." });
  } catch (error) {
    console.error("[DELETE_VERSION_ERROR]", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
