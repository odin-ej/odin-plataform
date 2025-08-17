import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import z from "zod";

const solicitationCreateSchema = z.object({
  description: z.string().min(10, "A descrição é muito curta."),
  datePerformed: z.string(), // Frontend envia como string 'YYYY-MM-DD' ou 'DD/MM/YYYY'
  isForEnterprise: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  membersSelected: z.array(z.string()),
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

    const validation = solicitationCreateSchema.safeParse(body);
    if (!validation.success) {
      console.error(validation.error.flatten().fieldErrors)
      return NextResponse.json({ message: "Dados inválidos", errors: validation.error.flatten() }, { status: 400 });
    }
    
    const { description, datePerformed, tags, membersSelected, attachments, isForEnterprise } = validation.data;

    // 1. Encontra as entidades ativas
    const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });
    const activeVersion = await prisma.jRPointsVersion.findFirst({ where: { isActive: true } });

    if (!activeSemester) {
      return NextResponse.json({ message: "Nenhum semestre está ativo. Um administrador precisa iniciar um novo período." }, { status: 400 });
    }
    if (!activeVersion) {
      return NextResponse.json({ message: "Nenhuma versão de regras do JR Points está ativa." }, { status: 400 });
    }

    const newSolicitation = await prisma.$transaction(async (tx) => {
      // Objeto de dados base para a nova solicitação
      // 1. Lógica condicional para associar ao placar correto e montar o objeto 'data'
      let data: Prisma.JRPointsSolicitationCreateInput;

      if (isForEnterprise) {
        const enterpriseScore = await tx.enterpriseSemesterScore.upsert({
          where: { semesterPeriodId: activeSemester.id },
          update: {},
          create: { semester: activeSemester.name, value: 0, semesterPeriodId: activeSemester.id },
        });
        data = {
          description,
          datePerformed: new Date(datePerformed).toISOString(),
          area: "DIRETORIA",
          user: { connect: { id: authUser.id } },
          jrPointsVersion: { connect: { id: activeVersion.id } },
          tags: { connect: tags?.map((id) => ({ id })) },
          membersSelected: { connect: membersSelected?.map((id) => ({ id })) },
          attachments: attachments ? { create: attachments.map(file => ({ ...file })) } : undefined,
          isForEnterprise: isForEnterprise || false, 
          enterpriseSemesterScore: { connect: { id: enterpriseScore.id } },
        };
      } else {
        const userSemesterScore = await tx.userSemesterScore.upsert({
          where: { userId_semesterPeriodId: { userId: authUser.id, semesterPeriodId: activeSemester.id } },
          update: {},
          create: { userId: authUser.id, semester: activeSemester.name, totalPoints: 0, semesterPeriodId: activeSemester.id },
        });
        data = {
          description,
          datePerformed: new Date(datePerformed).toISOString(),
          area: "DIRETORIA",
          user: { connect: { id: authUser.id } },
          jrPointsVersion: { connect: { id: activeVersion.id } },
          tags: { connect: tags?.map((id) => ({ id })) },
          membersSelected: { connect: membersSelected?.map((id) => ({ id })) },
          attachments: attachments ? { create: attachments.map(file => ({ ...file })) } : undefined,
          isForEnterprise: isForEnterprise || false,
          userSemesterScore: { connect: { id: userSemesterScore.id } },
        };
      }

      // 3. Cria a solicitação com os dados completos
      return await tx.jRPointsSolicitation.create({ data });
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
            notification: `Nova solicitação de pontos (${isForEnterprise ? 'Empresa' : 'Pessoal'}) enviada por ${authUser.name}.`,
        },
    });

    await prisma.notificationUser.createMany({
        data: allDirectorsID.map((director) => ({
            notificationId: notification.id,
            userId: director.id,
        })),
    });

    revalidatePath("/meus-pontos");
    revalidatePath("/gerenciar-jr-points");

    return NextResponse.json(newSolicitation, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    return NextResponse.json({ message: "Erro ao criar solicitação." }, { status: 500 });
  }
}