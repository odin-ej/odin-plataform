import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

const ENTERPRISE_USER_ID = "enterprise-points-id";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const { id } = await params;
    let tags = [];
   if (id === ENTERPRISE_USER_ID) {
      tags = await prisma.tag.findMany({
        where: { enterprisePointsId: 1 }, // ID fixo da empresa
        include: {
          assigner: { select: { name: true } },
          actionType: { select: { name: true } },
        },
        orderBy: { datePerformed: "desc" },
      });
    } else {
      // Se for um ID de usuário normal, busca as tags do usuário.
      const userPointsRecord = await prisma.userPoints.findUnique({
        where: { userId: id },
        include: {
          tags: {
            include: {
              assigner: { select: { name: true } },
              actionType: { select: { name: true } },
            },
            orderBy: { datePerformed: "desc" },
          },
        },
      });
      tags = userPointsRecord?.tags || [];
    }
    return NextResponse.json(tags);
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao buscar tags do utilizador.", error },
      { status: 500 }
    );
  }
}
