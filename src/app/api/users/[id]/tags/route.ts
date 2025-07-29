import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const { id } = await params;
   const userPointsRecord = await prisma.userPoints.findUnique({
      where: {
        userId: id, // Buscamos o registro de pontos pelo ID do usuário
      },
      // 2. Incluímos a relação 'tags' para buscar a lista COMPLETA de tags
      //    que pertencem a este registro de pontos.
      include: {
        tags: {
          // 3. Fazemos um 'include' aninhado para também buscar
          //    o nome de quem atribuiu ('assigner') cada tag.
          include: {
            assigner: {
              select: {
                name: true,
              },
            },
          },
          // Podemos manter a ordenação aqui
          orderBy: {
            datePerformed: "desc",
          },
        },
      },
    });
    const userTags = userPointsRecord?.tags || [];
    return NextResponse.json(userTags);
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao buscar tags do utilizador.", error },
      { status: 500 }
    );
  }
}
