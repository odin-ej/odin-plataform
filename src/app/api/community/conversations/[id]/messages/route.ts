import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const {id} = await params;

    const conversationId = id;
    const { content, attachments } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { message: "O conteúdo da mensagem é obrigatório." },
        { status: 400 }
      );
    }

    const newMessage = await prisma.directMessage.create({
      data: {
        content,
        authorId: authUser.id,
        conversationId: conversationId,
        attachments: {
          connectOrCreate: attachments?.map((att: { url: string; type: string }) => ({
            url: att.url,
            type: att.type,
          })) || [],
        }
      },
      include: {
        author: true, // Inclui o autor para retornar o objeto completo
      },
    });

    // Aqui você pode adicionar uma lógica para notificar o outro usuário via WebSocket (Pusher, Ably) no futuro
    // Por enquanto, o polling do React Query resolverá a atualização.

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return NextResponse.json(
      { message: "Erro ao enviar mensagem." },
      { status: 500 }
    );
  }
}
