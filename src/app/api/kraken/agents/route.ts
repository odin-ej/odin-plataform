import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const agents = await prisma.krakenAgent.findMany({
      orderBy: { displayName: "asc" },
      include: {
        _count: {
          select: {
            conversations: true,
            usageLogs: true,
          },
        },
      },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error("[Kraken Agents] GET error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();

    const agent = await prisma.krakenAgent.create({
      data: {
        id: body.id,
        displayName: body.displayName,
        mythology: body.mythology,
        description: body.description,
        model: body.model,
        maxTokens: body.maxTokens ?? 1024,
        systemPrompt: body.systemPrompt,
        isActive: body.isActive ?? true,
        iconUrl: body.iconUrl ?? null,
        color: body.color ?? null,
        requiresRag: body.requiresRag ?? false,
        ragScope: body.ragScope ?? [],
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("[Kraken Agents] POST error:", error);
    return NextResponse.json({ error: "Erro ao criar agente" }, { status: 500 });
  }
}
