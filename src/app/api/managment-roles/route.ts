import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET() {
  try {

   const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Nao autorizado" }, { status: 401 });
    }

    const [roles, users, interestCategories, professionalInterests] =
      await Promise.all([
        prisma.role.findMany({
          orderBy: {
            name: "asc",
          },
        }),
        prisma.user.findMany({
          orderBy: {
            name: "asc",
          },
          include: {
            currentRole: true,
            roleHistory: { include: { role: { select: { name: true } } } },
            roles: true,
          },
        }),
        prisma.interestCategory.findMany({
          include: { _count: { select: { interests: true } } },
        }),
        prisma.professionalInterest.findMany({ include: { category: true } }),
      ]);

    return NextResponse.json({
      roles,
      users,
      interestCategories,
      professionalInterests,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao buscar dados da página de gerenciamento de cargos." },
      { status: 500 }
    );
  }
}
