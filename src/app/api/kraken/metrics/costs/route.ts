import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const days = Math.min(
      Math.max(parseInt(searchParams.get("days") ?? "30", 10) || 30, 1),
      365
    );

    const dailyCosts = await prisma.$queryRaw<
      { date: string; agentId: string | null; cost: number }[]
    >`
      SELECT
        DATE("createdAt") as date,
        "agentId",
        SUM("estimatedCostUsd")::float as cost
      FROM "KrakenUsageLog"
      WHERE "createdAt" > NOW() - ${days}::int * interval '1 day'
      GROUP BY date, "agentId"
      ORDER BY date
    `;

    return NextResponse.json({ dailyCosts });
  } catch (error) {
    console.error("[Kraken Metrics Costs] GET error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
