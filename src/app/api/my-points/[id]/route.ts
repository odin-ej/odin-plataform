import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  // Garante que um usuário só possa ver os seus próprios pontos
  if (id !== authUser.id) {
    return NextResponse.json({ message: "Acesso negado" }, { status: 403 });
  }

  try {
    // Busca todos os dados necessários em paralelo para melhor performance
    const [
      points,
      allTagTemplates,
      allUsers,
      mySolicitations,
      myReports,
      mySemesterScores,
      enterprisePoints,
    ] = await Promise.all([
      // 1. Busca os pontos e tags do usuário específico
      prisma.userPoints.findUnique({
        where: { userId: id },
        include: {
          tags: {
            include: {
              actionType: { select: { name: true } },
              assigner: { select: { name: true } },
            },
            orderBy: { datePerformed: "desc" },
          },
        },
      }),
      // 2. Busca todos os modelos de tags para o modal de solicitação
      prisma.tagTemplate.findMany({
        orderBy: { name: "asc" },
        where: {
          jrPointsVersion: {
            isActive: true,
          },
        },
        include: {
          actionType: true,
        },
      }),
      // 3. Busca todos os outros usuários para o modal de solicitação
      prisma.user.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      // 4. Busca as solicitações do usuário
      prisma.jRPointsSolicitation.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          attachments: true,
          membersSelected: true,
          tags: true,
        },
      }),
      // 5. Busca os recursos (reports) do usuário
      prisma.jRPointsReport.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          tag: true,
          attachments: true,
        },
      }),
      prisma.userSemesterScore.findMany({
        where: { userId: id },
        orderBy: { semester: "desc" },
      }),
      prisma.enterprisePoints.findUnique({
        where: { id: 1 },
        include: { tags: { include: { actionType: true } } },
      }),
    ]);

    // Garante que mesmo que o usuário não tenha um registro de pontos, um objeto padrão seja retornado
    const myPointsData = points || { totalPoints: 0, tags: [] };

    return NextResponse.json({
      myPoints: myPointsData,
      allTagTemplates,
      allUsers,
      mySolicitations,
      myReports,
      mySemesterScores,
      enterpriseTags: enterprisePoints?.tags || [],
    });
  } catch (error) {
    console.error("Erro ao buscar dados de 'Meus Pontos':", error);
    return NextResponse.json(
      { message: "Erro ao buscar seus dados." },
      { status: 500 }
    );
  }
}
