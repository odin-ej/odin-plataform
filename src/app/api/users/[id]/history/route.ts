// app/api/users/[userId]/history/route.ts

import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticação: Garante que um usuário esteja logado.
    // A autorização para ver o histórico de outro usuário pode ser adicionada aqui se necessário.
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Encontra o semestre ativo para filtrar os dados corretamente.
    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true },
    });

    if (!activeSemester) {
      // Se não houver semestre ativo, retorna listas vazias.
      return NextResponse.json({ tags: [], solicitations: [], reports: [] });
    }

    // Busca todas as tags do usuário NO SEMESTRE ATIVO.
    const tags = await prisma.tag.findMany({
      where: {
        userPoints: { userId: id },
        // Filtra as tags que pertencem a um placar de semestre que seja o ativo.
        userSemesterScore: { semesterPeriodId: activeSemester.id },
      },
      include: {
        assigner: true,
        actionType: true,
        jrPointsVersion: true,
        generatedBySolicitation: { select: { id: true } },
        template: true,
      },
      orderBy: {
        datePerformed: "desc",
      },
    });

    // Busca todas as solicitações criadas pelo usuário.
    const solicitations = await prisma.jRPointsSolicitation.findMany({
      where: {
        userId: id,
        userSemesterScore: { semesterPeriodId: activeSemester.id },
      },
      include: {
        user: { select: { id: true, name: true, imageUrl: true, email: true } },
        attachments: true,
        membersSelected: true,
        tags: { include: { actionType: true, jrPointsVersion: { select: { versionName: true } }, } },
        solicitationTags: {
          include: {
            tagTemplate: {
              include: {
                actionType: true,
                jrPointsVersion: { select: { versionName: true } },
              },
            },
          },
        },
        jrPointsVersion: { select: { versionName: true } },
        reviewer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Busca todos os recursos criados pelo usuário.
    const reports = await prisma.jRPointsReport.findMany({
      where: {
        userId: id,
        userSemesterScore: { semesterPeriodId: activeSemester.id },
      },
      include: {
        user: { select: { id: true, name: true, imageUrl: true, email: true } },
        tag: {
          include: {
            assigner: true,
            actionType: true,
            template: { select: { name: true } },
          },
        },
        attachments: true,
        jrPointsVersion: { select: { versionName: true } },
        reviewer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Retorna o objeto completo que o frontend espera.
    return NextResponse.json({ tags, solicitations, reports });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao buscar histórico do usuário:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor.", error: error.message },
      { status: 500 }
    );
  }
}
