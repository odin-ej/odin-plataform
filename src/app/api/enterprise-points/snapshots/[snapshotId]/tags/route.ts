import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

// Rota: GET /api/enterprise-points/snapshots/{EnterpriseSemesterScore ID}/tags
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

    // Busca o placar semestral da empresa pelo ID do snapshot
    const enterpriseSemesterScore = await prisma.enterpriseSemesterScore.findUnique({
      where: { id: snapshotId },
      include: {
        // Inclui todas as tags associadas diretamente a este placar.
        tags: {
          include: {
            assigner: { select: { name: true } },
            actionType: { select: { name: true } },
          },
          orderBy: {
            datePerformed: 'desc',
          },
        },
      },
    });

    if (!enterpriseSemesterScore) {
      return NextResponse.json({ message: "Histórico da empresa não encontrado." }, { status: 404 });
    }
    
    // Retorna a lista de tags daquele snapshot
    return NextResponse.json(enterpriseSemesterScore.tags);

  } catch (error) {
    console.error("[ENTERPRISE_SNAPSHOT_TAGS_GET_ERROR]", error);
    return NextResponse.json({ message: "Erro ao buscar detalhes do histórico da empresa." }, { status: 500 });
  }
}