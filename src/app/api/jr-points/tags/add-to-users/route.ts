/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { differenceInDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

const addTagToUsersSchema = z.object({
  userIds: z.array(z.string()).min(1, "Selecione pelo menos um usuário."),
  templateIds: z.array(z.string()).min(1, "Selecione pelo menos uma tag."),
  datePerformed: z.string().min(5, "A data de realização é obrigatória."),
  description: z.string().optional(), // Descrição customizada para esta atribuição específica
  attachments: z.array(z.any()).optional(),
});

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);
  if (!hasPermission)
    return NextResponse.json({ message: "Acesso negado" }, { status: 403 });

  try {
    const body = await request.json();
    const validation = addTagToUsersSchema.safeParse(body);
    if (!validation.success) {
      console.error(validation.error.flatten().fieldErrors);
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { userIds, templateIds, datePerformed, description, attachments } =
      validation.data;

    const performedDateObject = fromZonedTime(
      datePerformed,
      "America/Sao_Paulo"
    );
    if (isNaN(performedDateObject.getTime())) {
      return NextResponse.json(
        { message: "Formato de data inválido. Use o formato AAAA-MM-DD." },
        { status: 400 }
      );
    }
    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true },
    });
    const activeVersion = await prisma.jRPointsVersion.findFirst({
      where: { isActive: true },
    });

    if (!activeSemester || !activeVersion) {
      return NextResponse.json(
        { message: "Nenhum semestre ou versão de regras está ativo." },
        { status: 400 }
      );
    }

    const tagTemplates = await prisma.tagTemplate.findMany({
      where: { id: { in: templateIds } },
    });

    if (tagTemplates.length !== templateIds.length) {
      return NextResponse.json(
        { message: "Um ou mais modelos de tag não foram encontrados." },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const directorSemesterScore = await tx.userSemesterScore.upsert({
        where: {
          userId_semesterPeriodId: {
            userId: authUser.id,
            semesterPeriodId: activeSemester.id,
          },
        },
        update: {},
        create: {
          userId: authUser.id,
          semester: activeSemester.name,
          totalPoints: 0,
          semesterPeriodId: activeSemester.id,
        },
      });
      await tx.jRPointsSolicitation.create({
        data: {
          userId: authUser.id,
          isForEnterprise: false,
          description:
            description ||
            `Atribuição de ${templateIds.length} tag(s) para ${userIds.length} membro(s).`,
          datePerformed: performedDateObject,
          status: "APPROVED",
          directorsNotes:
            "Aprovado automaticamente via painel de administração.",
          tags: { connect: templateIds.map((id) => ({ id })) },
          userSemesterScoreId: directorSemesterScore.id,
          membersSelected: { connect: userIds.map((id) => ({ id })) },
          attachments: attachments ? { create: attachments } : undefined,
          jrPointsVersionId: activeVersion.id,
          area: "DIRETORIA",
          reviewerId: authUser.id,
        },
      });

      for (const userId of userIds) {
        for (const templateId of templateIds) {
          const tagTemplate = await tx.tagTemplate.findUnique({
            where: { id: templateId },
          });
          if (!tagTemplate) {
            throw new Error(
              `O modelo de tag com ID ${templateId} não foi encontrado.`
            );
          }

          let finalValue = tagTemplate.baseValue;

          // Lógica de Streak
          if (
            tagTemplate.isScalable &&
            tagTemplate.escalationValue != null &&
            tagTemplate.escalationStreakDays != null
          ) {
            const lastInstance = await tx.tag.findFirst({
              where: { userPoints: { userId: userId }, templateId: templateId },
              orderBy: { datePerformed: "desc" },
            });
            if (lastInstance) {
              const daysSinceLast = differenceInDays(
                performedDateObject,
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

          const userPoints = await tx.userPoints.upsert({
            where: { userId },
            update: { totalPoints: { increment: finalValue } },
            create: { userId, totalPoints: finalValue },
          });

          const userSemesterScore = await tx.userSemesterScore.upsert({
            where: {
              userId_semesterPeriodId: {
                userId,
                semesterPeriodId: activeSemester.id,
              },
            },
            update: { totalPoints: { increment: finalValue } },
            create: {
              userId,
              semester: activeSemester.name,
              semesterPeriodId: activeSemester.id,
              totalPoints: finalValue,
            },
          });

          await tx.tag.create({
            data: {
              description: tagTemplate.description,
              value: finalValue,
              assignerId: authUser.id,
              datePerformed: performedDateObject,
              actionTypeId: tagTemplate.actionTypeId,
              templateId: tagTemplate.id,
              jrPointsVersionId: activeVersion.id,
              userPointsId: userPoints.id, // Conecta ao placar geral
              userSemesterScoreId: userSemesterScore.id, // Conecta ao placar do semestre
            },
          });
        }
      }
    });

    const notification = await prisma.notification.create({
      data: {
        link: "meu-pontos",
        type: "REQUEST_APPROVED",
        notification: `Você recebeu nova(s) tag(s) de JR Points. Atribuída(s) por: ${authUser.name}`,
      },
    });

    await prisma.notificationUser.createMany({
      data: userIds.map((id) => ({
        userId: id,
        notificationId: notification.id,
      })),
    });

    revalidatePath("/gerenciar-jr-points");
    revalidatePath("/jr-points");
    return NextResponse.json({
      message: `${userIds.length} usuário(s) receberam a tag com sucesso!`,
    });
  } catch (error: any) {
    console.error("Erro ao adicionar tag aos usuários:", error);
    return NextResponse.json(
      { message: "Erro ao adicionar tag.", error: error.message },
      { status: 500 }
    );
  }
}
