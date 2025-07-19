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
  try {
    const points = await prisma.userPoints.findUnique({
      where: {
        userId: id,
      },
      include: {
        tags: {
          include: {
            actionType: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    return NextResponse.json({ myPoints: points });
  } catch (error) {
    console.error("Erro ao buscar pontos:", error);
    return NextResponse.json(
      { message: "Erro ao buscar pontos." },
      { status: 500 }
    );
  }
}
