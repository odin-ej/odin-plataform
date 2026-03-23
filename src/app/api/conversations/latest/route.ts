import { NextResponse } from 'next/server';
import { prisma } from '@/db';
import { getAuthenticatedUser } from '@/lib/server-utils';


export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    const lastConversation = await prisma.conversation.findFirst({
      where: { userId: authUser.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (!lastConversation) {
      return NextResponse.json({ message: 'Nenhuma conversa encontrada.' }, { status: 404 });
    }

    return NextResponse.json(lastConversation);
  } catch (error) {
    console.error("Erro ao buscar a última conversa:", error);
    return NextResponse.json({ message: "Erro no servidor." }, { status: 500 });
  }
}