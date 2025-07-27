import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const links = await prisma.usefulLink.findMany({
      where: {
        userId: id,
      },
    });
    return NextResponse.json({ links });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao buscar links.", error },
      { status: 500 }
    );
  }
}
