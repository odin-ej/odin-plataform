import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

// Rota: GET /api/jr-points/snapshots/{UserSemesterScore ID}/tags
export async function GET(
  request: Request,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { snapshotId } = await params;

    const userSemesterScore = await prisma.userSemesterScore.findUnique({
      where: {
        id: snapshotId,
        // VERIFICAÇÃO DE SEGURANÇA: Garante que o usuário logado
        // seja o dono do histórico que está tentando acessar.
        userId: authUser.id,
      },
      include: {
        // Inclui todas as tags associadas a este placar semestral,
        // com seus detalhes aninhados.
        tags: {
          include: {
            assigner: { select: { name: true } },
            actionType: { select: { name: true } },
            jrPointsVersion: true,
          },
          orderBy: {
            datePerformed: 'desc',
          },
        },
      },
    });

    if (!userSemesterScore) {
      return NextResponse.json({ message: "Histórico não encontrado ou sem permissão para acessar." }, { status: 404 });
    }

    // Retorna apenas a lista de tags
    return NextResponse.json(userSemesterScore.tags);

  } catch (error) {
    console.error("[USER_SNAPSHOT_TAGS_GET_ERROR]", error);
    return NextResponse.json({ message: "Erro ao buscar detalhes do histórico." }, { status: 500 });
  }
}