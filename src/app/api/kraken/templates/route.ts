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

    const templates = await prisma.krakenTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        agent: true,
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("[Kraken Templates] GET error:", error);
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

    const template = await prisma.krakenTemplate.create({
      data: {
        triggerKeywords: body.triggerKeywords,
        category: body.category,
        agentId: body.agentId ?? null,
        questionExample: body.questionExample,
        response: body.response,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("[Kraken Templates] POST error:", error);
    return NextResponse.json(
      { error: "Erro ao criar template" },
      { status: 500 }
    );
  }
}
