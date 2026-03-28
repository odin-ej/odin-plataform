import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const agent = await prisma.krakenAgent.findUnique({ where: { id } });

    if (!agent) {
      return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("[Kraken Agent] GET error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const agent = await prisma.krakenAgent.update({
      where: { id },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.mythology !== undefined && { mythology: body.mythology }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.model !== undefined && { model: body.model }),
        ...(body.maxTokens !== undefined && { maxTokens: body.maxTokens }),
        ...(body.systemPrompt !== undefined && { systemPrompt: body.systemPrompt }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.iconUrl !== undefined && { iconUrl: body.iconUrl }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.requiresRag !== undefined && { requiresRag: body.requiresRag }),
        ...(body.ragScope !== undefined && { ragScope: body.ragScope }),
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error("[Kraken Agent] PATCH error:", error);
    return NextResponse.json({ error: "Erro ao atualizar agente" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;

    // Soft delete — set inactive instead of deleting
    await prisma.krakenAgent.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Kraken Agent] DELETE error:", error);
    return NextResponse.json({ error: "Erro ao desativar agente" }, { status: 500 });
  }
}
