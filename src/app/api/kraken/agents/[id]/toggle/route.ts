import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextResponse } from "next/server";
import { emitActivity } from "@/lib/kraken/activity";

export async function POST(
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

    const updated = await prisma.krakenAgent.update({
      where: { id },
      data: { isActive: !agent.isActive },
    });

    await emitActivity(
      updated.isActive ? "agent_start" : "error",
      {
        action: updated.isActive ? "activated" : "deactivated",
        agentName: updated.displayName,
        by: user.name,
      },
      { agentId: id, userId: user.id }
    );

    return NextResponse.json({
      id: updated.id,
      isActive: updated.isActive,
      displayName: updated.displayName,
    });
  } catch (error) {
    console.error("[Kraken Agent Toggle] error:", error);
    return NextResponse.json({ error: "Erro ao alternar agente" }, { status: 500 });
  }
}
