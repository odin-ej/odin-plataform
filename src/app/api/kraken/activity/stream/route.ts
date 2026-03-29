import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return new Response("Não autorizado", { status: 403 });
    }

    const events = await prisma.krakenActivityStream.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        agent: {
          select: {
            displayName: true,
            color: true,
          },
        },
      },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const event of events) {
          const data = JSON.stringify({
            id: event.id,
            eventType: event.eventType,
            agentId: event.agentId,
            agentDisplayName: event.agent?.displayName ?? null,
            agentColor: event.agent?.color ?? null,
            userId: event.userId,
            metadata: event.metadata,
            createdAt: event.createdAt.toISOString(),
          });
          controller.enqueue(
            encoder.encode(`id: ${event.id}\nevent: activity\ndata: ${data}\n\n`)
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Kraken Activity Stream] GET error:", error);
    return new Response("Erro interno", { status: 500 });
  }
}
