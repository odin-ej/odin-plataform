import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const {id} = await params
    const userTags = await prisma.tag.findMany({
      where: {
        userPoints: {
          userId: id,
        },
      },
      orderBy: {
        datePerformed: "desc",
      },
      include: {
        assigner: {
          select: {
            name: true,
          },
        },
      },
    });
    return NextResponse.json(userTags);
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao buscar tags do utilizador.", error },
      { status: 500 }
    );
  }
}
