import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    // Usamos Promise.all para buscar todos os dados em paralelo, de forma muito eficiente
    const [
      userPointsData,
      enterpriseData,
      allUsers,
      allTagTemplates,
      allActionTypes,
      allVersions,
      usersSemesterScore,
      solicitations,
      jrPointsReports,
      allSemesters,
      enterpriseSemesterScores,
    ] = await Promise.all([
      // 1. Busca os pontos dos usuários para o ranking
      prisma.userPoints.findMany({
        orderBy: { totalPoints: "desc" },
        include: {
          user: { select: { id: true, name: true, imageUrl: true } },
          // CORREÇÃO 1: Incluindo a contagem de tags para cada usuário
          _count: {
            select: { tags: true },
          },
          tags: {
            include: { actionType: true },

            orderBy: { datePerformed: "desc" },
          },
        },
      }),
      // 3. Busca os pontos e as tags da empresa
      prisma.enterprisePoints.findUnique({
        where: { id: 1 },
        include: {
          tags: {
            include: { actionType: true, assigner: { select: { name: true } } },

            orderBy: { datePerformed: "desc" },
          },
        },
      }),
      // 4. Busca todos os usuários para modais de atribuição
      prisma.user.findMany({
        select: { id: true, name: true, imageUrl: true },
        where: { isExMember: false },
      }),
      // 5. Busca todas as tags disponíveis para modais
      prisma.tagTemplate.findMany({
        include: { actionType: true, jrPointsVersion: true },
        where: { jrPointsVersion: { isActive: true } },
        orderBy: { name: "asc" },
      }),
      // 6. Busca todos os tipos de ação para modais
      prisma.actionType.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { tagTemplates: true },
          },
        },
      }),
      prisma.jRPointsVersion.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.userSemesterScore.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: true, tags: { include: { assigner: true, actionType: true, template: true} } },
      }),
      prisma.jRPointsSolicitation.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, imageUrl: true } },
          attachments: true,
          membersSelected: true,
          tags: { include: { actionType: true, } },
          reviewer:true,
        },
      }),
      prisma.jRPointsReport.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, imageUrl: true } },
          tag: { include: { assigner: true, actionType: true } },
          attachments:true,
          reviewer:true,
        },
      }),
      prisma.semester.findMany({
        orderBy: { createdAt: "desc" },
        where: {
          startDate: {
            gte: new Date("2025-01-01"),
          },
        },
      }),
      prisma.enterpriseSemesterScore.findMany({
        orderBy: { createdAt: "desc" },
        include: {  tags: { include: { assigner: true, actionType: true , template: true} } },
      }),
    ]);

    // Mapeia os dados do ranking
    const usersRanking = userPointsData.map((item) => ({
      id: item.user.id,
      name: item.user.name,
      imageUrl: item.user.imageUrl,
      totalPoints: item.totalPoints,
      tagsCount: item.tags.length,
      tags: item.tags,
    }));

    // Monta o objeto de resposta final com todos os dados
    const responseData = {
      usersRanking: usersRanking,
      enterprisePoints: enterpriseData,
      enterpriseTags: enterpriseData?.tags ?? [],
      allUsers: allUsers,
      allTagTemplates: allTagTemplates,
      allActionTypes: allActionTypes,
      allVersions: allVersions,
      usersSemesterScore: usersSemesterScore,
      solicitations,
      jrPointsReports,
      allSemesters,
      enterpriseSemesterScores,
    };
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Erro ao buscar dados para a página de JR Points:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro no servidor." },
      { status: 500 }
    );
  }
}
