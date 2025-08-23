import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ semesterName: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    const isDirector = checkUserPermission(authUser, DIRECTORS_ONLY);
    if (!isDirector)
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });

    const { semesterName } = await params;

    const userScoresToDelete = await prisma.userSemesterScore.findMany({
      where: { semester: semesterName },
      select: { id: true, user: {select: {id: true}} },
    });
    const enterpriseScoreToDelete =
      await prisma.enterpriseSemesterScore.findFirst({
        where: { semester: semesterName },
        select: { id: true },
      });

    const userScoreIds = userScoresToDelete.map((s) => s.id);
    const enterpriseScoreId = enterpriseScoreToDelete?.id;

    await prisma.$transaction(async (tx) => {
      // 2a. Deleta todas as relações filhas PRIMEIRO

      // Deleta tags associadas aos placares de usuário e empresa
      await tx.tag.deleteMany({
        where: {
          OR: [
            { userSemesterScoreId: { in: userScoreIds } },
            { enterpriseSemesterScoreId: enterpriseScoreId },
          ],
        },
      });

      // Deleta solicitações associadas
      await tx.jRPointsSolicitation.deleteMany({
        where: {
          OR: [
            { userSemesterScoreId: { in: userScoreIds } },
            { enterpriseSemesterScoreId: enterpriseScoreId },
          ],
        },
      });

      // Deleta recursos associados
      await tx.jRPointsReport.deleteMany({
        where: {
          OR: [
            { userSemesterScoreId: { in: userScoreIds } },
            { enterpriseSemesterScoreId: enterpriseScoreId },
          ],
        },
      });
      await tx.userPoints.updateMany({
        where: { userId: { in: userScoresToDelete.map((s) => s.user.id) } },
        data: { totalPoints: 0 },
      });

      await tx.enterprisePoints.update({
        where: { id: 1 },
        data: { value: 0 },
      });

      await tx.userSemesterScore.deleteMany({
        where: { id: { in: userScoreIds } },
      });
      if (enterpriseScoreId) {
        await tx.enterpriseSemesterScore.deleteMany({
          where: { id: enterpriseScoreId },
        });
      }
    });

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
      data: allDirectorsId
        .filter((user) => user.id !== authUser.id)
        .map((user) => ({
          notificationId: notification.id,
          userId: user.id,
        })),
    });
    revalidatePath("/jr-points");
    revalidatePath("/gerenciar-jr-points");
    return NextResponse.json({
      message: `Snapshot do semestre '${semesterName}' e todas as suas relações foram deletados com sucesso.`,
    });
  } catch (error) {
    console.error("[SNAPSHOT_DELETE_ERROR]", error);
    return NextResponse.json(
      { message: "Erro ao deletar snapshot." },
      { status: 500 }
    );
  }
}
