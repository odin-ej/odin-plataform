
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { notificationId } = await params;

  try {
    await prisma.notificationUser.update({
      where: {
        userId_notificationId: {
          userId: authUser.id,
          notificationId,
        },
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ message: "Notificação marcada como lida" });
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
