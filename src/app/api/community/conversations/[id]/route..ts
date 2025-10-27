import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import z from "zod";
import { revalidatePath } from "next/cache";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const {id} = await params;
    // 1. Busca a conversa no banco de dados.
    // A cláusula 'where' é crucial para a segurança: ela só encontrará a conversa
    // se o ID corresponder E se o usuário autenticado for um dos participantes.
    const conversation = await prisma.directConversation.findFirst({
      where: {
        id,
        participants: {
          some: {
            id: authUser.id,
          },
        },
      },
      include: {
        // Inclui os participantes para exibir nomes e avatares
        participants: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            phraseStatus: true,
            currentRole: true,
          },
        },
        // Inclui todas as mensagens, ordenadas da mais antiga para a mais recente
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            author: { // Inclui o autor de cada mensagem
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
            attachments: true, // Inclui quaisquer anexos
            reactions: { // Inclui as reações
              include: {
                user: { // Inclui o usuário que deu a reação
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 2. Se a conversa não for encontrada (ou o usuário não tiver permissão), retorna 404.
    if (!conversation) {
      return NextResponse.json(
        { message: "Conversa não encontrada ou acesso negado." },
        { status: 404 }
      );
    }

    // 3. Se tudo estiver correto, retorna os dados completos da conversa.
    return NextResponse.json(conversation);

  } catch (error) {
    console.error("Erro ao buscar dados da conversa:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro no servidor." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const {id} = await params

    // Verifica se o usuário é participante da conversa que está tentando editar
    const conversation = await prisma.directConversation.findFirst({
        where: { id, participants: { some: { id: authUser.id } } },
        include: { participants: true }
    });

    if (!conversation) {
        return NextResponse.json({ message: "Conversa não encontrada ou acesso negado." }, { status: 404 });
    }
    
    // Apenas conversas em grupo (mais de 2 pessoas) podem ter o título alterado
    if (conversation.participants.length <= 2) {
        return NextResponse.json({ message: "Apenas conversas em grupo podem ter o título alterado." }, { status: 403 });
    }

    const body = await request.json();
    const titleSchema = z.object({
        title: z.string().min(3).max(20)
    });
    const validation = titleSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ message: "Título inválido." }, { status: 400 });
    }

    const updatedConversation = await prisma.directConversation.update({
        where: { id },
        data: { title: validation.data.title }
    });

    revalidatePath('/comunidade')
    revalidatePath(`/comunidade/conversas/${conversation.id}`)
    return NextResponse.json(updatedConversation);

  } catch (error) {
    console.error("Erro ao atualizar o título da conversa:", error);
    return NextResponse.json({ message: "Erro ao atualizar o título." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const {id} = await params;
  try {
    
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversation = await prisma.directConversation.findFirst({
      where: { id, participants: { some: { id: authUser.id } } },
    });

    if(authUser.id !== conversation?.createdById) {
      return NextResponse.json(
        { error: "Apenas o criador da conversa pode deletá-la." },
        { status: 403 }
      );
    }

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada ou acesso negado." },
        { status: 404 }
      );
    }
    // Deleta a conversa para todos os participantes
    await prisma.directConversation.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao deletar conversa." },
      { status: 500 }
    );
  }
}