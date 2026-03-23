import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function PATCH() {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    await prisma.notificationUser.updateMany({
      where: {
        userId: authUser.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    return NextResponse.json({ message: "Notificações marcadas como lidas." });
  } catch (error) {
    console.error("Erro ao marcar notificações como lidas:", error);
    return NextResponse.json({ message: "Erro interno do servidor." }, { status: 500 });
  }
}
