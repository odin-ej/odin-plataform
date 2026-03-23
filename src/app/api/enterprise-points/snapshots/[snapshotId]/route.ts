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
    const enterpriseSemesterScore =
      await prisma.enterpriseSemesterScore.findUnique({
        where: { id: snapshotId },
        include: {
          // Inclui todas as tags associadas diretamente a este placar.
          tags: {
            include: {
              assigner: { select: { name: true } },
              actionType: { select: { name: true } },
              jrPointsVersion: { select: { versionName: true } },
              template: true,
            },
            orderBy: {
              datePerformed: "desc",
            },
          },
          solicitations: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              tags: true,
              membersSelected: true,
              jrPointsVersion: { select: { versionName: true } },
              reviewer: true,
              solicitationTags: {
                include: {
                  tagTemplate: {
                    include: {
                      actionType: true,
                      jrPointsVersion: true,
                    },
                  },
                },
              },
            },
          },
          reports: {
            include: {
              tag: true,
              attachments: true,
              user: { select: { id: true, name: true, email: true } },
              jrPointsVersion: { select: { versionName: true } },
              reviewer: true,
            },
          },
        },
      });

    if (!enterpriseSemesterScore) {
      return NextResponse.json(
        { message: "Histórico da empresa não encontrado." },
        { status: 404 }
      );
    }

    // Retorna a lista de tags daquele snapshot
    return NextResponse.json({
      tags: enterpriseSemesterScore.tags,
      solicitations: enterpriseSemesterScore.solicitations,
      reports: enterpriseSemesterScore.reports,
    });
  } catch (error) {
    console.error("[ENTERPRISE_SNAPSHOT_TAGS_GET_ERROR]", error);
    return NextResponse.json(
      { message: "Erro ao buscar detalhes do histórico da empresa." },
      { status: 500 }
    );
  }
}
