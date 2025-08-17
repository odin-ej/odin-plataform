import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";

// Schema atualizado para aceitar os dados de correção
const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  directorsNotes: z.string().min(1, "A justificativa é obrigatória."),
  // Campos opcionais para a correção
  newValue: z.number().int().optional(),
  newDescription: z.string().min(1).optional(),
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
    const { status, directorsNotes, newValue, newDescription } =
      reviewSchema.parse(body);

    const report = await prisma.jRPointsReport.findUnique({
      where: { id },
      include: { tag: true }, // Inclui a tag original
    });

    if (!report) {
      return new NextResponse("Recurso não encontrado", { status: 404 });
    }

    // Se for REJEITADO, apenas atualiza e encerra.
    if (status === "REJECTED") {
      const updatedReport = await prisma.jRPointsReport.update({
        where: { id },
        data: { status, directorsNotes },
      });

      const notification = await prisma.notification.create({
        data: {
          link: "meus-pontos",
          notification: `Recurso ${updatedReport.description.slice(0, 10)} rejeitado por ${authUser.name}`,
          type: "REQUEST_REJECTED",
        },
      });

      await prisma.notificationUser.create({
        data: {
          notificationId: notification.id,
          userId: updatedReport.userId,
        },
      });
      return NextResponse.json(updatedReport);
    }

    // Se for APROVADO, executa a lógica de correção
    await prisma.$transaction(async (tx) => {
      await tx.jRPointsReport.update({
        where: { id },
        data: { status, directorsNotes },
      });

      const originalTag = report.tag;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataToUpdate: any = { isFromAppeal: true };

      // Se uma nova descrição foi enviada, adiciona ao update
      if (newDescription) {
        dataToUpdate.description = newDescription;
      }

      // Se um novo valor foi enviado, calcula a diferença e ajusta os placares
      if (newValue !== undefined && newValue !== originalTag.value) {
        const pointDifference = newValue - originalTag.value;
        dataToUpdate.value = newValue;

        // Ajusta o placar correto (usuário ou empresa)
        if (originalTag.userPointsId) {
          await tx.userPoints.update({
            where: { id: originalTag.userPointsId },
            data: { totalPoints: { increment: pointDifference } },
          });
          if (originalTag.userSemesterScoreId) {
            await tx.userSemesterScore.update({
              where: { id: originalTag.userSemesterScoreId },
              data: { totalPoints: { increment: pointDifference } },
            });
          }
        } else if (originalTag.enterprisePointsId) {
          await tx.enterprisePoints.update({
            where: { id: originalTag.enterprisePointsId },
            data: { value: { increment: pointDifference } },
          });
          if (originalTag.enterpriseSemesterScoreId) {
            await tx.enterpriseSemesterScore.update({
              where: { id: originalTag.enterpriseSemesterScoreId },
              data: { value: { increment: pointDifference } },
            });
          }
        }
      }

      // Atualiza a tag original com as correções
      await tx.tag.update({ where: { id: report.tagId }, data: dataToUpdate });

      const notification = await prisma.notification.create({
        data: {
          link: `/jr-points`,
          notification: `${report.isForEnterprise ? "Um" : "O seu"} relatório de pontos foi atualizado pela diretoria. Clique no link para ver os detalhes.`,
          type: status === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
        },
      });

      if (report.isForEnterprise) {
        const allMembersId = await prisma.user.findMany({
          where: { isExMember: false },
          select: { id: true },
        });

        await prisma.notificationUser.createMany({
          data: allMembersId
            .filter((user) => user.id !== report.userId)
            .map((user) => ({
              notificationId: notification.id,
              userId: user.id,
            })),
        });
      } else {
        await prisma.notificationUser.create({
          data: {
            notificationId: notification.id,
            userId: report.userId,
          },
        });
      }
    });
    revalidatePath("/gerenciar-jr-points");
    revalidatePath("/meus-pontos");
    return NextResponse.json({
      message: "Recurso aprovado e corrigido com sucesso!",
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    console.error("Erro ao atualizar recurso:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar recurso." },
      { status: 500 }
    );
  }
}
