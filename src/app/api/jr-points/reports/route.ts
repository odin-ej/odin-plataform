import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";
import z from "zod";
import { Prisma } from "@prisma/client";

const reportCreateSchema = z.object({
  description: z.string().min(10),
  tagId: z.string(),
  isForEnterprise: z.boolean().optional(),
  attachments: z.array(z.object({
      url: z.string(),
      fileName: z.string(),
      fileType: z.string(),
    })).optional(),
});

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = reportCreateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ message: "Dados inválidos", errors: validation.error.flatten() }, { status: 400 });
    }
    const { description, tagId, attachments, isForEnterprise } = validation.data;

    // 1. Encontra as entidades ativas
    const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });
    const activeVersion = await prisma.jRPointsVersion.findFirst({ where: { isActive: true } });

    if (!activeSemester || !activeVersion) {
      return NextResponse.json({ message: "Nenhum semestre ou versão de regras está ativo." }, { status: 400 });
    }
    
    const newReport = await prisma.$transaction(async (tx) => {
        // Objeto de dados base
        const data: Prisma.JRPointsReportCreateInput = {
            description,
            area: "DIRETORIA",
            user: { connect: { id: authUser.id } },
            tag: { connect: { id: tagId } },
            jrPointsVersion: { connect: { id: activeVersion.id } },
            attachments: attachments ? { create: attachments.map(file => ({...file})) } : undefined,
            isForEnterprise: isForEnterprise || false,
        };

        // 2. Lógica condicional para associar ao placar correto
        if (isForEnterprise) {
            const enterpriseScore = await tx.enterpriseSemesterScore.upsert({
                where: { semesterPeriodId: activeSemester.id },
                update: {},
                create: { semester: activeSemester.name, value: 0, semesterPeriodId: activeSemester.id },
            });
            data.enterpriseSemesterScore = { connect: { id: enterpriseScore.id } };
        } else {
            const userSemesterScore = await tx.userSemesterScore.upsert({
                where: { userId_semesterPeriodId: { userId: authUser.id, semesterPeriodId: activeSemester.id } },
                update: {},
                create: { userId: authUser.id, semester: activeSemester.name, totalPoints: 0, semesterPeriodId: activeSemester.id },
            });
            data.userSemesterScore = { connect: { id: userSemesterScore.id } };
        }

        // 3. Cria o recurso com os dados completos
        return await tx.jRPointsReport.create({ data });
    });

    // Lógica de notificação
    const allDirectorsID = await prisma.user.findMany({
        where: { currentRole: { area: { has: "DIRETORIA" } } },
        select: { id: true },
    });

    const notification = await prisma.notification.create({
        data: {
            link: `/gerenciar-jr-points`,
            type: "NEW_MENTION",
            notification: `Novo recurso (${isForEnterprise ? 'Empresa' : 'Pessoal'}) enviado por ${authUser.name}.`,
        },
    });

    await prisma.notificationUser.createMany({
        data: allDirectorsID.map((director) => ({
            notificationId: notification.id,
            userId: director.id,
        })),
    });

    return NextResponse.json(newReport, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar recurso:", error);
    return NextResponse.json({ message: "Erro ao criar recurso." }, { status: 500 });
  }
}