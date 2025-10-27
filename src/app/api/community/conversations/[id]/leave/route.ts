import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const { id } = await params;
      const conversation = await prisma.directConversation.findFirst({
         where: { id, participants: { some: { id: authUser.id } } }
       });
      if (!conversation) {
         return NextResponse.json({ message: "Conversa não encontrada ou acesso negado." }, { status: 404 });
         }
      // Remove o usuário da conversa
      await prisma.directConversation.update({
        where: { id },
        data: {
            participants: {
                  disconnect: { id:  authUser.id }
            }
        }
      });
      revalidatePath('/comunidade')
      return new NextResponse(null, { status: 204 });
  }catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao sair da conversa." },
      { status: 500 }
    );
  }
} 
