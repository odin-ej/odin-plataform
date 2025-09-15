import { prisma } from "@/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [user, roles, interestCategories] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        include: {
          roles: true,
          currentRole: true,
          professionalInterests: true,
          roleHistory: { include: { role: true, managementReport: true } },
        },
      }),
      prisma.role.findMany(),
      prisma.interestCategory.findMany({
        include: {
          interests: { orderBy: { name: "asc" } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    if (!user) {
      return NextResponse.json(
        { message: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ user, roles, interestCategories });
  } catch (error) {
    console.error("Erro ao buscar dados do perfil:", error);
    return NextResponse.json(
      { message: "Erro ao buscar dados do perfil." },
      { status: 500 }
    );
  }
}
