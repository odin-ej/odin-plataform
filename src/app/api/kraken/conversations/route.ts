import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      50,
      Math.max(1, Number(searchParams.get("pageSize") || "20"))
    );
    const skip = (page - 1) * pageSize;

    const [conversations, total] = await Promise.all([
      prisma.krakenConversation.findMany({
        where: { userId: authUser.id, isActive: true },
        include: {
          agent: {
            select: { id: true, displayName: true, color: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.krakenConversation.count({
        where: { userId: authUser.id, isActive: true },
      }),
    ]);

    return NextResponse.json({
      data: conversations,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Erro ao buscar conversas do Kraken:", error);
    return NextResponse.json(
      { message: "Erro ao buscar conversas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const body = await request.json();

    const newConversation = await prisma.krakenConversation.create({
      data: {
        userId: authUser.id,
        title: body.title || null,
        agentId: body.agentId || null,
      },
      include: {
        agent: {
          select: { id: true, displayName: true, color: true },
        },
      },
    });

    return NextResponse.json(newConversation, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar conversa do Kraken:", error);
    return NextResponse.json(
      { message: "Erro ao criar conversa." },
      { status: 500 }
    );
  }
}
