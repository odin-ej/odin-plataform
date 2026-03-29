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

    const rateLimits = await prisma.krakenRateLimit.findMany({
      orderBy: { priority: "desc" },
    });

    return NextResponse.json(rateLimits);
  } catch (error) {
    console.error("[Kraken RateLimits] GET error:", error);
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

    const rateLimit = await prisma.krakenRateLimit.create({
      data: {
        roleIdentifier: body.roleIdentifier,
        displayName: body.displayName,
        maxDailyRequests: body.maxDailyRequests ?? 30,
        maxDailyTokens: body.maxDailyTokens ?? 50000,
        canUseAgents: body.canUseAgents ?? [],
        priority: body.priority ?? 0,
      },
    });

    return NextResponse.json(rateLimit, { status: 201 });
  } catch (error) {
    console.error("[Kraken RateLimits] POST error:", error);
    return NextResponse.json(
      { error: "Erro ao criar rate limit" },
      { status: 500 }
    );
  }
}
