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
      allUsers,
      allTags,
      allActionTypes,
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
        },
      }),
      // 2. Busca as configurações do ranking (se está oculto)
      prisma.jRPointsRanking.findUnique({ where: { id: 1 } }),
      // 3. Busca os pontos e as tags da empresa
      prisma.enterprisePoints.findUnique({
        where: { id: 1 },
        include: {
          tags: {
            include: { actionType: true },
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
      prisma.tag.findMany({
        where: { userPointsId: null, enterprisePointsId: null },
        include: { actionType: true },
        orderBy: { datePerformed: "asc" },
      }),
      // 6. Busca todos os tipos de ação para modais
      prisma.actionType.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { tags: true },
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
    }));

    // Monta o objeto de resposta final com todos os dados
    const responseData = {
      usersRanking: usersRanking,
      rankingIsHidden: rankingSettings?.isHidden ?? false,
      enterprisePoints: enterpriseData?.value ?? 0,
      enterpriseTags: enterpriseData?.tags ?? [],
      allUsers: allUsers,
      allTags: allTags,
      allActionTypes: allActionTypes,
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
