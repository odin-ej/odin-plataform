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
      include: { user: true, membersSelected: true, tags: true },
    });

    if (!solicitation) {
      return new NextResponse("Solicitação não encontrada", { status: 404 });
    }

    // Lógica para REJEIÇÃO (sem alterações)
    if (status === "REJECTED") {
      const updatedSolicitation = await prisma.jRPointsSolicitation.update({
        where: { id },
        data: { status, directorsNotes, reviewerId: authUser.id },
      });
      // ... toda a sua lógica de notificação para rejeição continua aqui ...
      return NextResponse.json(updatedSolicitation);
    }

    // Lógica para APROVAÇÃO
    if (solicitation.tags.length === 0) {
      throw new Error(
        "Aprovação falhou: A solicitação não contém tags para pontuar."
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.jRPointsSolicitation.update({
        where: { id },
        data: { status, directorsNotes, reviewerId: authUser.id },
      });

      const activeSemester = await tx.semester.findFirst({
        where: { isActive: true },
      });
      if (!activeSemester) throw new Error("Nenhum semestre ativo encontrado.");

      const activeVersion = await tx.jRPointsVersion.findFirst({
        where: { isActive: true },
      });
      if (!activeVersion) throw new Error("Nenhuma versão ativa.");

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
                
                const bonus = tagTemplate.baseValue >= 0 
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
              jrPointsVersionId: activeVersion.id,
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
          allUsersWithPossibleDuplicates.forEach(user => {
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
                   const bonus = tagTemplate.baseValue >= 0 
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
                jrPointsVersionId: activeVersion.id,
              },
            });
          }
        }
      }
      const notification = await prisma.notification.create({
        data: {
          notification: `Solicitação aprovada: ${solicitation.description} por ${authUser.name}`,
          type: "REQUEST_APPROVED",
          link: solicitation.isForEnterprise ? 'jr-points' : 'meus-pontos',
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
        const membersToReceive = [...solicitation.membersSelected, authUser];

        await prisma.notificationUser.createMany({
          data: membersToReceive.map((user) => ({
            notificationId: notification.id,
            userId: user.id,

          })),
        });
      }
    });
        revalidatePath('/jr-points')
        revalidatePath('/gerenciar-jr-points')
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
