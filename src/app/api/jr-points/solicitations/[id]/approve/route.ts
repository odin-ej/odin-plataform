// /api/jr-points/solicitations/[id]/approve/route.ts

import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { differenceInDays } from "date-fns";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  directorsNotes: z.string().min(1, "A justificativa é obrigatória."),
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
    const { status, directorsNotes } = reviewSchema.parse(body);

    const solicitation = await prisma.jRPointsSolicitation.findUnique({
      where: { id },
      include: {
        user: true,
        membersSelected: true,
        tags: true,
        solicitationTags: {
          include: {
            tagTemplate: true,
          },
        },
      },
    });

    if (!solicitation) {
      return new NextResponse("Solicitação não encontrada", { status: 404 });
    }

    // Lógica para APROVAÇÃO
    if (solicitation.status === status) {
      return NextResponse.json({
        message: "O status da solicitação já é este.",
      });
    }

    await prisma.$transaction(async (tx) => {
      if (solicitation.status === "APPROVED" && status === "REJECTED") {
        const tagsToDelete = await tx.tag.findMany({
          where: { generatedBySolicitationId: id },
        });

        for (const tag of tagsToDelete) {
          const pointsToReverse = tag.value * -1; // Inverte o valor para subtrair
          if (tag.userPointsId) {
            await tx.userPoints.updateMany({
              where: { id: tag.userPointsId },
              data: { totalPoints: { increment: pointsToReverse } },
            });
          }
          if (tag.userSemesterScoreId) {
            await tx.userSemesterScore.updateMany({
              where: { id: tag.userSemesterScoreId },
              data: { totalPoints: { increment: pointsToReverse } },
            });
          }
          if (tag.enterprisePointsId) {
            await tx.enterprisePoints.update({
              where: { id: 1 },
              data: { value: { increment: pointsToReverse } },
            });
          }
          if (tag.enterpriseSemesterScoreId) {
            await tx.enterpriseSemesterScore.updateMany({
              where: { id: tag.enterpriseSemesterScoreId },
              data: { value: { increment: pointsToReverse } },
            });
          }
        }
        await tx.tag.deleteMany({ where: { generatedBySolicitationId: id } });
      }

      if (status === "APPROVED") {
        const activeSemester = await tx.semester.findFirst({
          where: { isActive: true },
        });
        if (!activeSemester)
          throw new Error("Nenhum semestre ativo encontrado.");

        const formatedDate = new Date(solicitation.datePerformed);

        for (const solicitationTag of solicitation.solicitationTags) {
          // --- CASO 1: APROVAÇÃO PARA A EMPRESA ---
          const tagTemplate = solicitationTag.tagTemplate;
          if (solicitation.isForEnterprise) {
            let finalValue = tagTemplate.baseValue;
            if (
              tagTemplate.isScalable &&
              tagTemplate.escalationValue != null &&
              tagTemplate.escalationStreakDays != null
            ) {
              const lastInstance = await tx.tag.findFirst({
                where: { enterprisePointsId: 1, templateId: tagTemplate.id },
                orderBy: { datePerformed: "desc" },
              });
              if (lastInstance) {
                const daysSinceLast = differenceInDays(
                  formatedDate,
                  lastInstance.datePerformed
                );
                if (daysSinceLast <= tagTemplate.escalationStreakDays) {
                  const bonus =
                    tagTemplate.baseValue >= 0
                      ? Math.abs(tagTemplate.escalationValue)
                      : -Math.abs(tagTemplate.escalationValue);
                  finalValue = lastInstance.value + bonus;
                }
              }
            }
            await tx.enterprisePoints.update({
              where: { id: 1 },
              data: { value: { increment: finalValue } },
            });
            const enterpriseScore = await tx.enterpriseSemesterScore.upsert({
              where: { semesterPeriodId: activeSemester.id },
              update: { value: { increment: finalValue } },
              create: {
                semester: activeSemester.name,
                value: finalValue,
                semesterPeriodId: activeSemester.id,
              },
            });
            await tx.tag.create({
              data: {
                description: tagTemplate.description,
                value: finalValue,
                datePerformed: formatedDate,
                actionTypeId: tagTemplate.actionTypeId,
                templateId: tagTemplate.id,
                enterprisePointsId: 1,
                assignerId: authUser.id,
                enterpriseSemesterScoreId: enterpriseScore.id,
                jrPointsVersionId: solicitation.jrPointsVersionId,
                generatedBySolicitationId: solicitation.id,
              },
            });
          }
          // --- CASO 2: APROVAÇÃO PARA USUÁRIOS ---
          else {
            // ✅ CORREÇÃO: Lógica para remover usuários duplicados
            const allUsersWithPossibleDuplicates = [
              ...solicitation.membersSelected,
            ];
            const uniqueUsersMap = new Map();
            allUsersWithPossibleDuplicates.forEach((user) => {
              if (user) {
                uniqueUsersMap.set(user.id, user);
              }
            });
            const uniqueInvolvedUsers = Array.from(uniqueUsersMap.values());

            for (const user of uniqueInvolvedUsers) {
              let finalValue = tagTemplate.baseValue;
              if (
                tagTemplate.isScalable &&
                tagTemplate.escalationValue != null &&
                tagTemplate.escalationStreakDays != null
              ) {
                const lastInstance = await tx.tag.findFirst({
                  where: {
                    userPoints: { userId: user.id },
                    templateId: tagTemplate.id,
                  },
                  orderBy: { datePerformed: "desc" },
                });
                if (lastInstance) {
                  const daysSinceLast = differenceInDays(
                    formatedDate,
                    lastInstance.datePerformed
                  );
                  if (daysSinceLast <= tagTemplate.escalationStreakDays) {
                    // ✅ CORREÇÃO: Lógica de bônus/pena consistente aplicada aqui também
                    const bonus =
                      tagTemplate.baseValue >= 0
                        ? Math.abs(tagTemplate.escalationValue)
                        : -Math.abs(tagTemplate.escalationValue);
                    finalValue = lastInstance.value + bonus;
                  }
                }
              }
              const userPoints = await tx.userPoints.upsert({
                where: { userId: user.id },
                update: { totalPoints: { increment: finalValue } },
                create: { userId: user.id, totalPoints: finalValue },
              });
              const userSemesterScore = await tx.userSemesterScore.upsert({
                where: {
                  userId_semesterPeriodId: {
                    userId: user.id,
                    semesterPeriodId: activeSemester.id,
                  },
                },
                update: { totalPoints: { increment: finalValue } },
                create: {
                  userId: user.id,
                  semester: activeSemester.name,
                  totalPoints: finalValue,
                  semesterPeriodId: activeSemester.id,
                },
              });
              await tx.tag.create({
                data: {
                  description: tagTemplate.description,
                  value: finalValue,
                  datePerformed: formatedDate,
                  actionTypeId: tagTemplate.actionTypeId,
                  templateId: tagTemplate.id,
                  userPointsId: userPoints.id,
                  assignerId: authUser.id,
                  userSemesterScoreId: userSemesterScore.id,
                  jrPointsVersionId: solicitation.jrPointsVersionId,
                  generatedBySolicitationId: solicitation.id,
                },
              });
            }
          }
        }
      }

      await tx.jRPointsSolicitation.update({
        where: { id },
        data: { status, directorsNotes, reviewerId: authUser.id },
      });

      const notificationMessage =
        solicitation.status === "PENDING"
          ? `Sua solicitação foi ${
              status === "APPROVED" ? "aprovada" : "rejeitada"
            } por ${authUser.name}`
          : `O status da sua solicitação foi alterado de ${solicitation.status === 'REJECTED' ? 'Rejeitada' : 'Aprovada'} para ${status} por ${authUser.name}`;

      let usersToNotify = [solicitation.user].map((u) => ({ id: u.id }));

      if (solicitation.isForEnterprise) {
        usersToNotify = await tx.user.findMany({
          where: { isExMember: false },
          select: { id: true },
        });
      }

      // Cria uma notificação para CADA usuário afetado
      const notificationPromises = usersToNotify.map((userToNotify) =>
        tx.notification.create({
          data: {
            notification: notificationMessage,
            type:
              status === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
            link: solicitation.isForEnterprise ? "/jr-points" : "/meus-pontos",
            notificationUsers: { create: { userId: userToNotify.id } },
          },
        })
      );
      await Promise.all(notificationPromises);
    });
    revalidatePath("/jr-points");
    revalidatePath("/gerenciar-jr-points");
    revalidatePath("/meus-pontos");
    return NextResponse.json({ message: "Solicitação aprovada com sucesso!" });
  } catch (error) {
    if (error instanceof z.ZodError)
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    const errorMessage =
      error instanceof Error ? error.message : "Erro Interno do Servidor";
    return new NextResponse(errorMessage, { status: 500 });
  }
}
