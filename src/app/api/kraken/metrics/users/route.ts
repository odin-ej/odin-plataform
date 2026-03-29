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
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 1),
      100
    );

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const topUsers = await prisma.krakenUsageLog.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since } },
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          inputTokens: "desc",
        },
      },
      take: limit,
    });

    const userIds = topUsers.map((u) => u.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const result = topUsers.map((entry) => ({
      userId: entry.userId,
      userName: userMap.get(entry.userId) ?? "Desconhecido",
      totalTokens:
        (entry._sum.inputTokens ?? 0) + (entry._sum.outputTokens ?? 0),
      inputTokens: entry._sum.inputTokens ?? 0,
      outputTokens: entry._sum.outputTokens ?? 0,
      requestCount: entry._count.id,
    }));

    return NextResponse.json({ topUsers: result });
  } catch (error) {
    console.error("[Kraken Metrics Users] GET error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
