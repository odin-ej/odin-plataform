import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";
import { routeMessage, getFallbackResponse } from "@/lib/kraken/router";
import { executeAgent, getAgentConfig } from "@/lib/kraken/agent-executor";
import {
  getOrCreateConversation,
  saveUserMessage,
  saveAssistantMessage,
  updateConversationAfterResponse,
} from "@/lib/kraken/conversation-manager";
import { checkRateLimit, incrementDailyUsage } from "@/lib/kraken/rate-limiter";
import { findCachedResponse, cacheResponse } from "@/lib/kraken/cache/semantic-cache";
import { findTemplateMatch } from "@/lib/kraken/cache/template-matcher";
import { emitActivity } from "@/lib/kraken/activity";
import { calculateCost } from "@/lib/kraken/types";

/**
 * POST /api/kraken — Main Kraken chat endpoint.
 * Receives a message, routes to the right agent, streams the response.
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Mensagem é obrigatória" },
        { status: 400 }
      );
    }

    // 2. Rate limit check
    const userAreas = user.roles?.flatMap((r) => r.area) ?? [];
    const rateCheck = await checkRateLimit(user.id, userAreas);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMIT_EXCEEDED",
          message: `Você atingiu o limite diário de ${rateCheck.limit} perguntas. Tente novamente amanhã.`,
          remaining: rateCheck.remaining,
          limit: rateCheck.limit,
        },
        { status: 429 }
      );
    }

    // 3. Get or create conversation
    const conversation = await getOrCreateConversation(conversationId, user.id);

    // Save user message
    await saveUserMessage(conversation.id, message.trim());

    // 4. Template match (no API call — cheapest)
    const templateMatch = await findTemplateMatch(message.trim());
    if (templateMatch) {
      await emitActivity("template_hit", { query: message.slice(0, 100) }, {
        agentId: templateMatch.agentId ?? undefined,
        userId: user.id,
      });

      await saveAssistantMessage({
        conversationId: conversation.id,
        content: templateMatch.response,
        agentId: templateMatch.agentId ?? "kraken_router",
        inputTokens: 0,
        outputTokens: 0,
        cached: false,
        templateUsed: true,
        latencyMs: 0,
      });

      await incrementDailyUsage(user.id, 0, 0);

      return streamTextResponse(templateMatch.response, templateMatch.agentId);
    }

    // 5. Semantic cache check
    const cacheHit = await findCachedResponse(message.trim());
    if (cacheHit) {
      await emitActivity("cache_hit", { query: message.slice(0, 100) }, {
        agentId: cacheHit.agent ?? undefined,
        userId: user.id,
      });

      await saveAssistantMessage({
        conversationId: conversation.id,
        content: cacheHit.response,
        agentId: cacheHit.agent ?? "kraken_router",
        inputTokens: 0,
        outputTokens: 0,
        cached: true,
        templateUsed: false,
        latencyMs: 0,
      });

      await incrementDailyUsage(user.id, 0, 0);

      return streamTextResponse(cacheHit.response, cacheHit.agent);
    }

    // 6. Route to agent
    await emitActivity("routing", { query: message.slice(0, 100) }, {
      userId: user.id,
    });

    const routing = await routeMessage(message.trim());

    // Handle fallback
    if (routing.agent === "kraken_fallback") {
      const fallbackResponse = getFallbackResponse();
      await saveAssistantMessage({
        conversationId: conversation.id,
        content: fallbackResponse,
        agentId: "kraken_router",
        inputTokens: 0,
        outputTokens: 0,
        cached: false,
        templateUsed: false,
        latencyMs: 0,
      });
      return streamTextResponse(fallbackResponse, "kraken_router");
    }

    // 7. Check agent access for user's role
    if (
      rateCheck.agentsAllowed.length > 0 &&
      !rateCheck.agentsAllowed.includes(routing.agent)
    ) {
      const msg =
        "Seu cargo não tem acesso a este agente. Contate um administrador.";
      await saveAssistantMessage({
        conversationId: conversation.id,
        content: msg,
        agentId: routing.agent,
        inputTokens: 0,
        outputTokens: 0,
        cached: false,
        templateUsed: false,
        latencyMs: 0,
      });
      return streamTextResponse(msg, routing.agent);
    }

    // 8. Execute agent with streaming
    const agentConfig = await getAgentConfig(routing.agent);
    if (!agentConfig) {
      const msg =
        "Este agente está temporariamente desativado. Tente novamente mais tarde.";
      return streamTextResponse(msg, null);
    }

    await emitActivity("agent_start", { query: message.slice(0, 100) }, {
      agentId: routing.agent,
      userId: user.id,
    });

    const { stream, result } = await executeAgent({
      agentId: routing.agent,
      query: routing.query_refined,
      conversationId: conversation.id,
      userId: user.id,
    });

    // 9. Post-processing in background (don't block the stream)
    result.then(async (res) => {
      try {
        const cost = calculateCost(agentConfig.model, res.usage);

        await Promise.all([
          saveAssistantMessage({
            conversationId: conversation.id,
            content: res.fullText,
            agentId: routing.agent,
            inputTokens: res.usage.inputTokens,
            outputTokens: res.usage.outputTokens,
            cached: false,
            templateUsed: false,
            latencyMs: res.latencyMs,
          }),
          updateConversationAfterResponse({
            conversationId: conversation.id,
            agentId: routing.agent,
            inputTokens: res.usage.inputTokens,
            outputTokens: res.usage.outputTokens,
            model: agentConfig.model,
            firstMessage: conversation.messages.length === 0 ? message : undefined,
          }),
          incrementDailyUsage(
            user.id,
            res.usage.inputTokens + res.usage.outputTokens,
            cost
          ),
          cacheResponse(message.trim(), res.fullText, routing.agent),
          emitActivity(
            "agent_complete",
            {
              tokens: res.usage.inputTokens + res.usage.outputTokens,
              latencyMs: res.latencyMs,
              cost,
            },
            { agentId: routing.agent, userId: user.id }
          ),
          prisma.krakenUsageLog.create({
            data: {
              userId: user.id,
              agentId: routing.agent,
              model: agentConfig.model,
              inputTokens: res.usage.inputTokens,
              outputTokens: res.usage.outputTokens,
              estimatedCostUsd: cost,
              cached: false,
              templateUsed: false,
              latencyMs: res.latencyMs,
              conversationId: conversation.id,
            },
          }),
        ]);
      } catch (err) {
        console.error("[Kraken] Post-processing error:", err);
      }
    });

    // Return SSE stream with agent info header
    const encoder = new TextEncoder();
    const agentInfoEvent = `data: ${JSON.stringify({
      type: "agent_start",
      data: agentConfig.displayName,
      agent: routing.agent,
      color: agentConfig.color,
    })}\n\n`;

    const prefixedStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // Send agent info first
        controller.enqueue(encoder.encode(agentInfoEvent));

        // Then pipe the agent stream
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(prefixedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Kraken-Conversation-Id": conversation.id,
        "X-Kraken-Agent": routing.agent,
      },
    });
  } catch (error) {
    console.error("[Kraken] Error:", error);
    return NextResponse.json(
      { error: "Erro interno do Kraken. Tente novamente." },
      { status: 500 }
    );
  }
}

// Import prisma for usage log
import { prisma } from "@/db";

/**
 * Helper to stream a simple text response as SSE.
 * Used for cached/template/fallback responses.
 */
function streamTextResponse(text: string, agentId: string | null) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (agentId) {
        const agentEvent = JSON.stringify({
          type: "agent_start",
          data: agentId,
          agent: agentId,
        });
        controller.enqueue(encoder.encode(`data: ${agentEvent}\n\n`));
      }

      const tokenEvent = JSON.stringify({ type: "token", data: text });
      controller.enqueue(encoder.encode(`data: ${tokenEvent}\n\n`));

      const doneEvent = JSON.stringify({ type: "done", data: "" });
      controller.enqueue(encoder.encode(`data: ${doneEvent}\n\n`));

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
}
