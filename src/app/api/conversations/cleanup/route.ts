import { prisma } from "@/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { message: "Acesso não autorizado." },
        { status: 401 }
      );
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.conversation.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
    });

    const message = `${result.count} conversas antigas foram apagadas.`;

    return NextResponse.json({ message });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao apagar conversas antigas." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect(); // Adicione esta linha
  }
}
