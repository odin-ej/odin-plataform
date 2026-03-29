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

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalMessagesToday,
      todayAggregates,
      last7dTotal,
      last7dCacheHits,
      last7dTemplateHits,
      activeAgents,
      totalConversations,
    ] = await Promise.all([
      prisma.krakenUsageLog.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      prisma.krakenUsageLog.aggregate({
        where: { createdAt: { gte: startOfToday } },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          estimatedCostUsd: true,
        },
      }),
      prisma.krakenUsageLog.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.krakenUsageLog.count({
        where: { createdAt: { gte: sevenDaysAgo }, cached: true },
      }),
      prisma.krakenUsageLog.count({
        where: { createdAt: { gte: sevenDaysAgo }, templateUsed: true },
      }),
      prisma.krakenAgent.count({
        where: { isActive: true },
      }),
      prisma.krakenConversation.count(),
    ]);

    const totalTokensToday =
      (todayAggregates._sum.inputTokens ?? 0) +
      (todayAggregates._sum.outputTokens ?? 0);
    const totalCostToday = Number(todayAggregates._sum.estimatedCostUsd ?? 0);
    const cacheHitRate =
      last7dTotal > 0 ? last7dCacheHits / last7dTotal : 0;
    const templateHitRate =
      last7dTotal > 0 ? last7dTemplateHits / last7dTotal : 0;

    return NextResponse.json({
      totalMessagesToday,
      totalTokensToday,
      totalCostToday,
      cacheHitRate,
      templateHitRate,
      activeAgents,
      totalConversations,
    });
  } catch (error) {
    console.error("[Kraken Metrics] GET error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
