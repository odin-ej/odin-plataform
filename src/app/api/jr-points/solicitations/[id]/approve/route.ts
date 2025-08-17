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
      include: { user: true, membersSelected: true, tags: true },
    });

    if (!solicitation) {
      return new NextResponse("Solicitação não encontrada", { status: 404 });
    }

    // Se for REJEITADO, apenas atualiza e encerra.
    if (status === "REJECTED") {
      const updatedSolicitation = await prisma.jRPointsSolicitation.update({
        where: { id },
        data: { status, directorsNotes },
      });
      const notification = await prisma.notification.create({
        data: {
          notification: `Solicitação rejeitada: ${solicitation.description} por ${authUser.name}`,
          type: "REQUEST_REJECTED",
          link: "meus-pontos",
        },
      });
      if (solicitation.isForEnterprise) {
        const allMembersId = await prisma.user.findMany({
          where: { isExMember: false },
          select: { id: true },
        });
        await prisma.notificationUser.createMany({
          data: allMembersId
            .filter((user) => user.id !== authUser.id)
            .map((user) => ({
              notificationId: notification.id,
              userId: user.id,
            })),
        });
      } else {
        await prisma.notificationUser.createMany({
          data: solicitation.membersSelected.map((user) => ({
            notificationId: notification.id,
            userId: user.id,
          })),
        });
      }
      return NextResponse.json(updatedSolicitation);
    }

    // Se for APROVADO, executa a lógica complexa
    if (solicitation.tags.length === 0) {
      throw new Error(
        "Aprovação falhou: A solicitação não contém tags para pontuar."
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.jRPointsSolicitation.update({
        where: { id },
        data: { status, directorsNotes },
      });

      const activeSemester = await tx.semester.findFirst({
        where: { isActive: true },
      });
      if (!activeSemester) throw new Error("Nenhum semestre ativo encontrado.");

      const activeVersion = await tx.jRPointsVersion.findFirst({
        where: {isActive: true},
      })

      if(!activeVersion) throw new Error('Nenhuma versão ativa.');

      const formatedDate = new Date(solicitation.datePerformed);

      for (const tagTemplate of solicitation.tags) {
        // --- CASO 1: APROVAÇÃO PARA A EMPRESA ---
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
                finalValue = lastInstance.value + tagTemplate.escalationValue;
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
              jrPointsVersionId: activeVersion.id,
            },
          });
        }
        // --- CASO 2: APROVAÇÃO PARA USUÁRIOS ---
        else {
          const allInvolvedUsers = [
            solicitation.user,
            ...solicitation.membersSelected,
          ];
          for (const user of allInvolvedUsers) {
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
                  finalValue = lastInstance.value + tagTemplate.escalationValue;
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
                jrPointsVersionId: activeVersion.id,
              },
            });
          }
        }
      }
      const notification = await prisma.notification.create({
        data: {
          notification: `Solicitação aprovada: ${solicitation.description} por ${authUser.name}`,
          type: "POINTS_AWARDED",
          link: "meus-pontos",
        },
      });
      if (solicitation.isForEnterprise) {
        const allMembersId = await prisma.user.findMany({
          where: { isExMember: false },
          select: { id: true },
        });
        await prisma.notificationUser.createMany({
          data: allMembersId
            .filter((user) => user.id !== authUser.id)
            .map((user) => ({
              notificationId: notification.id,
              userId: user.id,
            })),
        });
      } else {
        await prisma.notificationUser.createMany({
          data: solicitation.membersSelected.map((user) => ({
            notificationId: notification.id,
            userId: user.id,
          })),
        });
      }
    });
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
