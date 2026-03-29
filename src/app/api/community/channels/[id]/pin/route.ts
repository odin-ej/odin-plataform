import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !await can(authUser, AppAction.MANAGE_COMMUNITY_CHANNELS))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {id} = await params;

    const channel = await prisma.channel.findFirst({
      where: { id },
    });
    if (!channel) {
      return NextResponse.json(
        { error: "Canal não encontrado." },
        { status: 404 }
      );
    }
    if (channel.isPinned) {
      // Despin the channel
      await prisma.channel.update({
        where: { id },
        data: { isPinned: false },
      });
    } else {
      // Pin the channel
      await prisma.channel.update({
        where: { id },
        data: { isPinned: true },
      });
    }
    revalidatePath('/comunidade')
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao atualizar o status de fixação do canal." },
      { status: 500 }
    );
  }
}
