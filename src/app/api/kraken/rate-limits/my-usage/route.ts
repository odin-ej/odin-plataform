import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/kraken/rate-limiter";

/**
 * GET /api/kraken/rate-limits/my-usage
 * Returns the current user's rate limit status.
 * Available to any authenticated user (not admin-only).
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userAreas = user.roles?.flatMap((r) => r.area) ?? [];
    const result = await checkRateLimit(user.id, userAreas);

    return NextResponse.json({
      remaining: result.remaining,
      limit: result.limit,
      tokensRemaining: result.tokensRemaining,
      tokensLimit: result.tokensLimit,
    });
  } catch (error) {
    console.error("[Kraken Rate Limit] my-usage error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
