import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest, {params}: {params: Promise<{semesterName: string}>}) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    const isDirector = checkUserPermission(authUser, DIRECTORS_ONLY);
    if (!isDirector)
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });

    const {semesterName} = await params

  const [userScoresResult, enterpriseScoreResult] = await prisma.$transaction([
      // 1. Deleta todos os placares de usuários daquele semestre
      prisma.userSemesterScore.deleteMany({
        where: {
          semester: semesterName,
        },
      }),
      // 2. Deleta o placar da empresa daquele semestre
      prisma.enterpriseSemesterScore.deleteMany({
        where: {
            semester: semesterName,
        }
      })
    ]);

    const totalCount = userScoresResult.count + enterpriseScoreResult.count;

    if (totalCount === 0) {
      return NextResponse.json({
        message: `Nenhum snapshot encontrado.`,
      });
    }

    const allDirectorsId = await prisma.user.findMany({
      where: { currentRole: { area: { has: "DIRETORIA" } } },
      select: { id: true },
    });

    // Deleta todos os registros de UserPoints que correspondem ao semestre
    const notification = await prisma.notification.create({
      data: {
        link: "/gerenciar-jr-points",
        type: "NEW_MENTION",
        notification: `O snapshot do semestre ${semesterName} foi deletado por ${authUser.name}.`,
      },
    });

    await prisma.notificationUser.createMany({
      data: allDirectorsId.filter((user) => user.id !== authUser.id).map((user) => ({
        notificationId: notification.id,
        userId: user.id,
      })),
    })
    revalidatePath('/gerenciar-jr-points')
    return NextResponse.json({
      message: `Snapshot do semestre ${semesterName} deletado com sucesso. ${totalCount} registros removidos.`,
    });
  } catch (error) {
    console.error("[SNAPSHOT_DELETE_ERROR]", error);
    return NextResponse.json(
      { message: "Erro ao deletar snapshot." },
      { status: 500 }
    );
  }
}
