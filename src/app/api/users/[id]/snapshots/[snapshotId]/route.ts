import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";
// Rota: GET /api/jr-points/snapshots/{UserSemesterScore ID}
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
      },
      include: {
        // Inclui todas as tags associadas a este placar semestral,
        // com seus detalhes aninhados.
        tags: {
          include: {
            assigner: { select: { name: true } },
            actionType: { select: { name: true } },
            jrPointsVersion: true,
            template: true,
          },
          orderBy: {
            datePerformed: "desc",
          },
        },
        solicitations: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            tags: {
              include: {
                actionType: { select: { name: true } },
                jrPointsVersion: true,
              },
            },
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
            membersSelected: true,
            jrPointsVersion: { select: { versionName: true } },
            reviewer: true,
          },
        },
        reports: {
          include: {
            tag: {
              include: {
                assigner: { select: { name: true } },
                actionType: { select: { name: true } },
                jrPointsVersion: true,
                template: true,
              },
            },
            attachments: true,
            user: { select: { id: true, name: true, email: true } },
            jrPointsVersion: { select: { versionName: true } },
            reviewer: true,
          },
        },
      },
    });

    if (!userSemesterScore) {
      return NextResponse.json(
        { message: "Histórico não encontrado ou sem permissão para acessar." },
        { status: 404 }
      );
    }

    // Retorna apenas a lista de tags
    return NextResponse.json({
      tags: userSemesterScore.tags,
      solicitations: userSemesterScore.solicitations,
      reports: userSemesterScore.reports,
    });
  } catch (error) {
    console.error("[USER_SNAPSHOT_TAGS_GET_ERROR]", error);
    return NextResponse.json(
      { message: "Erro ao buscar detalhes do histórico." },
      { status: 500 }
    );
  }
}
