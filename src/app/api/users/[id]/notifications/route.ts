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
    const id = (await params).id;
    const notifications = await prisma.notificationUser.findMany({
      where: {
        userId: id,
      },
      include: {
        notification: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Erro ao buscar notificação:", error);
    return NextResponse.json(
      { message: "Erro ao buscar notificação." },
      { status: 500 }
    );
  }
}
