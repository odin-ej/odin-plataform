import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const channel = await prisma.channel.findFirst({
      where: { id, members: { some: { id: authUser.id } } },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Conversa não encontrada ou acesso negado." },
        { status: 404 }
      );
    }

    // Deleta o canal para todos os membros
    await prisma.channel.delete({ where: { id} });
    revalidatePath("/comunidade");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao deletar conversa." },
      { status: 500 }
    );
  }
}
