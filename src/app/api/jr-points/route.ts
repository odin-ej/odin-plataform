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
      rankingSettings,
      enterpriseData,
      enterpriseSemesterScores,
      allVersions,
      allSemesters,
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
          tags: { include: { actionType: true } },
        },
      }),
      // 2. Busca as configurações do ranking (se está oculto)
      prisma.jRPointsRanking.findUnique({ where: { id: 1 } }),
      // 3. Busca os pontos e as tags da empresa
      prisma.enterprisePoints.findUnique({
        where: { id: 1 },
        include: {
          tags: {
            include: { actionType: true, assigner: { select: { name: true } }, jrPointsVersion: {select: {versionName: true}} },
            orderBy: { datePerformed: "desc" },
          },
        },
      }),
      prisma.enterpriseSemesterScore.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.jRPointsVersion.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            // Inclui a contagem de templates associados
            select: { tagTemplates: true },
          },
          tagTemplates: { include: { actionType: true } },
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
    ]);

    // Mapeia os dados do ranking
    const usersRanking = userPointsData.map((item) => ({
      id: item.user.id,
      name: item.user.name,
      imageUrl: item.user.imageUrl,
      totalPoints: item.totalPoints,
      tagsCount: item._count.tags,
      tags: item.tags,
    }));

    // Monta o objeto de resposta final com todos os dados
    const responseData = {
      myPoints: userPointsData.find((u) => u.user.id === authUser.id)
        ?.totalPoints,
      usersRanking: usersRanking,
      rankingIsHidden: rankingSettings?.isHidden ?? false,
      enterprisePoints: enterpriseData?.value ?? 0,
      enterpriseTags: enterpriseData?.tags ?? [],
      enterpriseSemesterScores,
      allVersions,
      allSemesters,
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
