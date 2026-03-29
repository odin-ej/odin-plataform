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
    const rateLimit = await prisma.krakenRateLimit.findUnique({
      where: { id },
    });

    if (!rateLimit) {
      return NextResponse.json(
        { error: "Rate limit não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rateLimit);
  } catch (error) {
    console.error("[Kraken RateLimit] GET error:", error);
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

    const rateLimit = await prisma.krakenRateLimit.update({
      where: { id },
      data: {
        ...(body.roleIdentifier !== undefined && {
          roleIdentifier: body.roleIdentifier,
        }),
        ...(body.displayName !== undefined && {
          displayName: body.displayName,
        }),
        ...(body.maxDailyRequests !== undefined && {
          maxDailyRequests: body.maxDailyRequests,
        }),
        ...(body.maxDailyTokens !== undefined && {
          maxDailyTokens: body.maxDailyTokens,
        }),
        ...(body.canUseAgents !== undefined && {
          canUseAgents: body.canUseAgents,
        }),
        ...(body.priority !== undefined && { priority: body.priority }),
      },
    });

    return NextResponse.json(rateLimit);
  } catch (error) {
    console.error("[Kraken RateLimit] PATCH error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar rate limit" },
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

    await prisma.krakenRateLimit.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Kraken RateLimit] DELETE error:", error);
    return NextResponse.json(
      { error: "Erro ao deletar rate limit" },
      { status: 500 }
    );
  }
}
