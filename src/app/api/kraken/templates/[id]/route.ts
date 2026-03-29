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
    const template = await prisma.krakenTemplate.findUnique({
      where: { id },
      include: { agent: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("[Kraken Template] GET error:", error);
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

    const template = await prisma.krakenTemplate.update({
      where: { id },
      data: {
        ...(body.triggerKeywords !== undefined && {
          triggerKeywords: body.triggerKeywords,
        }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.agentId !== undefined && { agentId: body.agentId }),
        ...(body.questionExample !== undefined && {
          questionExample: body.questionExample,
        }),
        ...(body.response !== undefined && { response: body.response }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("[Kraken Template] PATCH error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar template" },
      { status: 500 }
    );
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

    await prisma.krakenTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Kraken Template] DELETE error:", error);
    return NextResponse.json(
      { error: "Erro ao deletar template" },
      { status: 500 }
    );
  }
}
