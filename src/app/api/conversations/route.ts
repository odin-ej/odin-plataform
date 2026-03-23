/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { prisma } from '@/db';
import { getAuthenticatedUser } from '@/lib/server-utils';
// Função para o downgrade de IAs
export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });

    const newConversation = await prisma.conversation.create({
      data: {
        title: "Nova Conversa", // Um título padrão
        userId: authUser.id,
      },
    });

    return NextResponse.json(newConversation);
  } catch (error) {
    return NextResponse.json({ message: "Erro ao criar conversa.", error }, { status: 500 });
  }
}

// --- FUNÇÃO GET: Obter o histórico de conversas do utilizador ---
export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });

    const conversations = await prisma.conversation.findMany({
      where: { userId: authUser.id },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    return NextResponse.json({ message: "Erro ao buscar histórico." }, { status: 500 });
  }
}
