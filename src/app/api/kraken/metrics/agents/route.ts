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

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const agentMetrics = await prisma.krakenUsageLog.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: since } },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        estimatedCostUsd: true,
      },
      _count: {
        id: true,
      },
    });

    const agentIds = agentMetrics
      .map((m) => m.agentId)
      .filter((id): id is string => id !== null);

    const agents = await prisma.krakenAgent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, displayName: true, color: true },
    });
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    const result = agentMetrics.map((entry) => {
      const agent = entry.agentId ? agentMap.get(entry.agentId) : null;
      return {
        agentId: entry.agentId,
        displayName: agent?.displayName ?? "Desconhecido",
        color: agent?.color ?? null,
        totalTokens:
          (entry._sum.inputTokens ?? 0) + (entry._sum.outputTokens ?? 0),
        inputTokens: entry._sum.inputTokens ?? 0,
        outputTokens: entry._sum.outputTokens ?? 0,
        totalCost: Number(entry._sum.estimatedCostUsd ?? 0),
        requestCount: entry._count.id,
      };
    });

    result.sort((a, b) => b.totalTokens - a.totalTokens);

    return NextResponse.json({ agentMetrics: result });
  } catch (error) {
    console.error("[Kraken Metrics Agents] GET error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
