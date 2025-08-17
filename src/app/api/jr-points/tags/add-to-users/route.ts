/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { differenceInDays, parse } from "date-fns";

const addTagToUsersSchema = z.object({
  userIds: z.array(z.string()).min(1, "Selecione pelo menos um usuário."),
  templateIds: z.array(z.string()).min(1, "Selecione pelo menos uma tag."),
  datePerformed: z.string().min(5, "A data de realização é obrigatória."),
  description: z.string().optional(), // Descrição customizada para esta atribuição específica
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

    const { userIds, templateIds, datePerformed, description } =
      validation.data;

    const parsedDate = parse(datePerformed, "dd/MM/yyyy", new Date());

    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { message: "Formato de data inválido. Use DD/MM/AAAA." },
        { status: 400 }
      );
    }

    const formatedDate = parsedDate.toISOString();

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
      for (const userId of userIds) {
        for (const tagTemplate of tagTemplates) {
          let finalValue = tagTemplate.baseValue;

          if (
            tagTemplate.isScalable &&
            tagTemplate.escalationValue != null &&
            tagTemplate.escalationStreakDays != null
          ) {
            const lastInstance = await tx.tag.findFirst({
              where: {
                userPoints: { userId: userId },
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
            where: { userId },
            update: { totalPoints: { increment: finalValue } },
            create: {
              userId,
              totalPoints: finalValue,
            },
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
              description: description || tagTemplate.description,
              value: finalValue,
              assignerId: authUser.id,
              datePerformed: formatedDate,
              areas: tagTemplate.areas,
              actionTypeId: tagTemplate.actionTypeId,
              templateId: tagTemplate.id,
              userPointsId: userPoints.id,
              userSemesterScoreId: userSemesterScore.id,
              jrPointsVersionId: activeVersion.id,
            },
          });

          const assigner = await tx.user.findUnique({
            where: { id: authUser.id },
            select: { name: true },
          });

          // 3. Cria a notificação para o usuário
          const notification = await tx.notification.create({
            data: {
              notification: `Você recebeu ${finalValue} pontos por: "${tagTemplate.name}"! Por: ${assigner?.name}`,
              type: "POINTS_AWARDED",
              link: "/meus-pontos",
            },
          });

          await tx.notificationUser.create({
            data: {
              notificationId: notification.id,
              userId,
            },
          });
        }
      }
    });

    // --- FIM DA NOVA LÓGICA ---

    // 1. Garante que o registro de pontos do usuário existe e atualiza o total de pontos.

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
