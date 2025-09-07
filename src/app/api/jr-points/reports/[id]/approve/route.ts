import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  directorsNotes: z.string().min(1, "A justificativa é obrigatória."),
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
      include: { tag: true },
    });

    if (!report) {
      return new NextResponse("Recurso não encontrado", { status: 404 });
    }
    if (!report.tag) {
      return NextResponse.json({ message: "A tag associada a este recurso não foi encontrada." }, { status: 404 });
    }

    const wasPreviouslyApproved = report.status === "APPROVED";
    const originalTag = report.tag;

    await prisma.$transaction(async (tx) => {
      // 1. Determina o estado de pontos inicial.
      const initialPointsAwarded = wasPreviouslyApproved ? originalTag.value : 0;
      
      // 2. Determina o estado final dos pontos e se a tag deve ser atualizada.
      const shouldUpdateTag = newValue !== undefined || newDescription !== undefined;
      let finalPointsToBeAwarded: number;

      if (status === 'REJECTED') {
        // Se está rejeitando, o resultado final dos pontos no placar é 0,
        // a menos que uma correção de valor esteja sendo feita explicitamente.
        finalPointsToBeAwarded = newValue !== undefined ? newValue : 0;
      } else { // status === 'APPROVED'
        // Se está aprovando, o resultado final é o novo valor ou o valor que a tag já tinha.
        finalPointsToBeAwarded = newValue !== undefined ? newValue : originalTag.value;
      }

      // 3. Calcula a diferença exata a ser aplicada nos placares.
      const pointDifference = finalPointsToBeAwarded - initialPointsAwarded;

      // 4. Aplica a diferença de pontos aos placares, se houver mudança.
      if (pointDifference !== 0) {
        if (originalTag.userPointsId) {
          await tx.userPoints.update({ where: { id: originalTag.userPointsId }, data: { totalPoints: { increment: pointDifference } } });
          if (originalTag.userSemesterScoreId) {
            await tx.userSemesterScore.update({ where: { id: originalTag.userSemesterScoreId }, data: { totalPoints: { increment: pointDifference } } });
          }
        } else if (originalTag.enterprisePointsId) {
          await tx.enterprisePoints.update({ where: { id: originalTag.enterprisePointsId }, data: { value: { increment: pointDifference } } });
          if (originalTag.enterpriseSemesterScoreId) {
            await tx.enterpriseSemesterScore.update({ where: { id: originalTag.enterpriseSemesterScoreId }, data: { value: { increment: pointDifference } } });
          }
        }
      }

      // 5. Atualiza a tag com os novos valores se uma correção foi enviada.
      // Isso agora acontece mesmo na rejeição, se um novo valor for passado.
      if (shouldUpdateTag) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataToUpdateTag: any = { isFromAppeal: true };
        if (newValue !== undefined) {
          dataToUpdateTag.value = newValue;
        }
        if (newDescription) {
          dataToUpdateTag.description = newDescription;
        }
        await tx.tag.update({ where: { id: report.tagId }, data: dataToUpdateTag });
      }

      // 6. Atualiza o status do recurso em si.
      await tx.jRPointsReport.update({
        where: { id },
        data: { status, directorsNotes, reviewerId: authUser.id },
      });

      // 7. Lógica de Notificação (mantida como antes)
      const notificationType = status === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_REJECTED";
      const notificationMessage = status === "APPROVED" 
        ? `${report.isForEnterprise ? "Um" : "O seu"} recurso de pontos foi aprovado e atualizado pela diretoria.`
        : `Seu recurso sobre "${originalTag.description.slice(0, 20)}..." foi rejeitado por ${authUser.name}.`;

      const notification = await tx.notification.create({
        data: {
          link: `/meus-pontos`,
          notification: notificationMessage,
          type: notificationType,
        },
      });

      if (report.isForEnterprise) {
        const allMembersId = await tx.user.findMany({ where: { isExMember: false }, select: { id: true } });
        await tx.notificationUser.createMany({
          data: allMembersId.filter(user => user.id !== report.userId).map(user => ({
            notificationId: notification.id,
            userId: user.id,
          })),
        });
      } else {
        await tx.notificationUser.create({
          data: { notificationId: notification.id, userId: report.userId },
        });
      }
    });

    revalidatePath("/gerenciar-jr-points");
    revalidatePath("/meus-pontos");

    return NextResponse.json({ message: "Status do recurso atualizado com sucesso!" });
  } catch (error) {
    if (error instanceof z.ZodError) return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    console.error("Erro ao atualizar recurso:", error);
    return NextResponse.json({ message: "Erro ao atualizar recurso." }, { status: 500 });
  }
}

