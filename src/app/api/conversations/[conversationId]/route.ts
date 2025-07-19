import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
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
    return NextResponse.json(
      { message: "Erro ao buscar a conversa.", error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { conversationId } = await params;

    // Garante que o utilizador só pode apagar as suas próprias conversas
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: authUser.id,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        {
          message:
            "Conversa não encontrada ou não tem permissão para a apagar.",
        },
        { status: 404 }
      );
    }

    // Apaga a conversa (e as mensagens associadas, devido ao onDelete: Cascade no schema)
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error("Erro ao apagar conversa:", error);
    return NextResponse.json(
      { message: "Erro ao apagar a conversa." },
      { status: 500 }
    );
  }
}
