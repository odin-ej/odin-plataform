import prisma from "@/db";
import { KrakenActivityEventType } from "./types";

/**
 * Emit an activity event to the Kraken activity stream.
 * Used by the admin dashboard for real-time visualization.
 */
export async function emitActivity(
  eventType: KrakenActivityEventType,
  metadata: Record<string, unknown> = {},
  options?: {
    agentId?: string;
    userId?: string;
  }
) {
  try {
    await prisma.krakenActivityStream.create({
      data: {
        eventType,
        agentId: options?.agentId ?? null,
        userId: options?.userId ?? null,
        metadata: metadata as object,
      },
    });
  } catch (error) {
    // Activity logging should never break the main flow
    console.error("[Kraken Activity] Failed to emit:", error);
  }
}
