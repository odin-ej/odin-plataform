import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET() {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const houseGoals = await prisma.estrategyObjective.findMany({
      include: {
        goals: true,
      },
      orderBy: {
        // Exemplo: mantenha a ordem por nome ou por criação
        createdAt: "asc",
        // ou alguma outra coluna que reflita a ordem que você deseja manter
      },
    });
    return NextResponse.json(houseGoals);
  } catch (error) {
    console.error("Erro ao buscar metas da casinha:", error);
    return NextResponse.json(
      { message: "Erro ao buscar metas da casinha." },
      { status: 500 }
    );
  }
}
