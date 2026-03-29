import { prisma } from "@/db";
import { AreaRoles } from "@prisma/client";
import { KrakenRateLimitResult } from "./types";

/**
 * Map AreaRoles to rate limit identifiers.
 */
function areaToRateLimitIdentifier(areas: AreaRoles[]): string {
  if (areas.includes(AreaRoles.PRESIDENCIA)) return "presidente";
  if (areas.includes(AreaRoles.DIRETORIA) || areas.includes(AreaRoles.CONSELHO))
    return "diretor";
  if (areas.includes(AreaRoles.TATICO)) return "tatico";
  if (areas.includes(AreaRoles.TRAINEE)) return "trainee";
  return "membro";
}

/**
 * Check rate limit for a user based on their role/area.
 */
export async function checkRateLimit(
  userId: string,
  userAreas: AreaRoles[]
): Promise<KrakenRateLimitResult> {
  // Determine rate limit identifier from user's areas
  const identifier = areaToRateLimitIdentifier(userAreas);

  // Find the applicable rate limit (highest priority match)
  const rateLimit = await prisma.krakenRateLimit.findFirst({
    where: {
      roleIdentifier: identifier,
      isActive: true,
    },
    orderBy: { priority: "desc" },
  });

  if (!rateLimit) {
    // Default fallback: 20 requests/day
    return {
      allowed: true,
      remaining: 20,
      limit: 20,
      tokensRemaining: 50000,
      tokensLimit: 50000,
      agentsAllowed: [],
    };
  }

  // Get today's usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyUsage = await prisma.krakenDailyUsage.findUnique({
    where: {
      userId_date: { userId, date: today },
    },
  });

  const requestsUsed = dailyUsage?.requestsCount ?? 0;
  const tokensUsed = dailyUsage?.tokensUsed ?? 0;

  const requestsRemaining = Math.max(0, rateLimit.maxDailyRequests - requestsUsed);
  const tokensRemaining = Math.max(0, rateLimit.maxDailyTokens - tokensUsed);

  return {
    allowed: requestsRemaining > 0 && tokensRemaining > 0,
    remaining: requestsRemaining,
    limit: rateLimit.maxDailyRequests,
    tokensRemaining,
    tokensLimit: rateLimit.maxDailyTokens,
    agentsAllowed: rateLimit.canUseAgents,
  };
}

/**
 * Increment daily usage counters for a user.
 */
export async function incrementDailyUsage(
  userId: string,
  tokens: number,
  costUsd: number
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.$executeRaw`
    INSERT INTO "KrakenDailyUsage" ("id", "userId", "date", "requestsCount", "tokensUsed", "costUsd", "createdAt")
    VALUES (gen_random_uuid(), ${userId}, ${today}::date, 1, ${tokens}, ${costUsd}, NOW())
    ON CONFLICT ("userId", "date")
    DO UPDATE SET
      "requestsCount" = "KrakenDailyUsage"."requestsCount" + 1,
      "tokensUsed" = "KrakenDailyUsage"."tokensUsed" + ${tokens},
      "costUsd" = "KrakenDailyUsage"."costUsd" + ${costUsd}
  `;
}
