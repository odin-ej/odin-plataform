import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;

    const conversation = await prisma.krakenConversation.findFirst({
      where: { id, userId: authUser.id, isActive: true },
      include: {
        agent: {
          select: { id: true, displayName: true, color: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversa não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Erro ao buscar conversa do Kraken:", error);
    return NextResponse.json(
      { message: "Erro ao buscar conversa." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;

    const conversation = await prisma.krakenConversation.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversa não encontrada." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData: { title?: string; isActive?: boolean } = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updated = await prisma.krakenConversation.update({
      where: { id },
      data: updateData,
      include: {
        agent: {
          select: { id: true, displayName: true, color: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar conversa do Kraken:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar conversa." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;

    const conversation = await prisma.krakenConversation.findFirst({
      where: { id, userId: authUser.id, isActive: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversa não encontrada ou já removida." },
        { status: 404 }
      );
    }

    await prisma.krakenConversation.update({
      where: { id },
      data: { isActive: false },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao remover conversa do Kraken:", error);
    return NextResponse.json(
      { message: "Erro ao remover conversa." },
      { status: 500 }
    );
  }
}
