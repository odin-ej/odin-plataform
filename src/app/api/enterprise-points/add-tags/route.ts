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

// Schema agora espera um array de IDs de TagTemplate
const addTagsToEnterpriseSchema = z.object({
  templateIds: z
    .array(z.string())
    .min(1, "Selecione pelo menos um modelo de tag."),
  datePerformed: z.string().min(5, "A data de realização é obrigatória."),
  description: z.string().optional(),
  attachments: z.array(z.any()).optional(),
});

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);
    if (!hasPermission) {
      return NextResponse.json({ message: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const validation = addTagsToEnterpriseSchema.safeParse(body);

    if (!validation.success) {
      console.error(validation.error.flatten().fieldErrors);
      return NextResponse.json(
        { message: "Dados inválidos.", errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { templateIds, datePerformed, description, attachments } =
      validation.data;

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

    const performedDateObject = fromZonedTime(
      datePerformed,
      "America/Sao_Paulo"
    );
    // Verifica se a data criada é válida. `getTime()` retorna NaN para datas inválidas.
    if (isNaN(performedDateObject.getTime())) {
      return NextResponse.json(
        { message: "Formato de data inválido. Use o formato AAAA-MM-DD." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
       const enterpriseSemesterScore = await tx.enterpriseSemesterScore.upsert({
        where: { semesterPeriodId: activeSemester.id },
        update: {},
        create: { semester: activeSemester.name, value: 0, semesterPeriodId: activeSemester.id },
      });
      await tx.jRPointsSolicitation.create({
        data: {
          userId: authUser.id,
          isForEnterprise: true,
          description:
            description ||
            `Atribuição de ${templateIds.length} tag(s) para a empresa.`,
          datePerformed: performedDateObject,
          status: "APPROVED", // Status já definido como aprovado
          directorsNotes:
            "Aprovado automaticamente via painel de gerenciamento.",
          tags: { connect: templateIds.map((id) => ({ id })) },
          attachments: attachments ? { create: attachments } : undefined,
          jrPointsVersionId: activeVersion.id,
          area: "DIRETORIA",
          reviewerId: authUser.id,
          enterpriseSemesterScoreId: enterpriseSemesterScore.id
        },
      });
      let totalValueToAdd = 0;

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

        // --- LÓGICA DE ESCALONAMENTO E STREAK PARA A EMPRESA ---
        if (
          tagTemplate.isScalable &&
          tagTemplate.escalationValue != null &&
          tagTemplate.escalationStreakDays != null
        ) {
          const lastInstance = await tx.tag.findFirst({
            where: { enterprisePointsId: 1, templateId: templateId }, // Procura a última tag da empresa deste template
            orderBy: { datePerformed: "desc" },
          });

          if (lastInstance) {
            const daysSinceLast = differenceInDays(
              performedDateObject,
              lastInstance.datePerformed
            );
            if (daysSinceLast <= tagTemplate.escalationStreakDays) {
              finalValue = lastInstance.value + tagTemplate.escalationValue;
            }
          }
        }

        await tx.tag.create({
          data: {
            description: tagTemplate.description,
            value: finalValue,
            datePerformed: performedDateObject,
            actionTypeId: tagTemplate.actionTypeId,
            jrPointsVersionId: activeVersion.id,
            templateId: tagTemplate.id,
            enterprisePointsId: 1,
            enterpriseSemesterScoreId: enterpriseSemesterScore.id,
            assignerId: authUser.id,
          },
        });

        totalValueToAdd += finalValue;
      }

      // Atualiza os placares uma única vez no final
      if (totalValueToAdd !== 0) {
        await tx.enterprisePoints.update({
          where: { id: 1 },
          data: { value: { increment: totalValueToAdd } },
        });

        await tx.enterpriseSemesterScore.upsert({
          where: { semesterPeriodId: activeSemester.id },
          update: { value: { increment: totalValueToAdd } },
          create: {
            semester: activeSemester.name,
            semesterPeriodId: activeSemester.id,
            value: totalValueToAdd,
          },
        });
      }
    });
    const allMembersId = await prisma.user.findMany({
      where: { isExMember: false },
      select: { id: true },
    });

    const notification = await prisma.notification.create({
      data: {
        link: "/jr-points",
        type: "GENERAL_ALERT",
        notification: `${authUser.name} adicionou uma nova tag a Pontuação da Empresa.`,
      },
    });

    await prisma.notificationUser.createMany({
      data: allMembersId
        .filter((member) => member.id !== authUser.id)
        .map((member) => ({
          notificationId: notification.id,
          userId: member.id,
          isRead: false,
        })),
    });

    revalidatePath("/gerenciar-jr-points");
    revalidatePath("/jr-points");
    return NextResponse.json({
      message: `${templateIds.length} tag(s) adicionada(s) à empresa com sucesso!`,
    });
  } catch (error: any) {
    console.error("Erro ao adicionar tags à empresa:", error);
    return NextResponse.json(
      { message: "Erro ao adicionar tags à empresa.", error: error.message },
      { status: 500 }
    );
  }
}
