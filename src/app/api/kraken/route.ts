import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";
import { routeMessage, getFallbackResponse, getGreetingResponse } from "@/lib/kraken/router";
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
import { s3Client } from "@/lib/aws";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

async function resolveIconUrl(key: string | null | undefined): Promise<string | null> {
  if (!key || key.trim() === "") return null;
  // Already a signed URL — return as-is
  if (key.includes("X-Amz-Signature")) return key;
  // Extract key from full S3 URL
  if (key.startsWith("http://") || key.startsWith("https://")) {
    try { key = decodeURIComponent(new URL(key).pathname.slice(1)); } catch { return null; }
  }
  // Images are uploaded to the knowledge-base bucket (CHAT_BUCKET)
  // Try knowledge-base first (where uploads go), then user-avatars as fallback
  const buckets = [
    process.env.AWS_S3_CHAT_BUCKET_NAME,      // odin-platform-knowledge-base (primary)
    process.env.AWS_S3_BUCKET_NAME,           // odin-platform-user-avatars (fallback)
  ].filter(Boolean) as string[];

  for (const bucket of buckets) {
    try {
      // Verify the key actually exists before generating URL
      await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch {
      // Also try with kraken-agents/ prefix
      try {
        const prefixedKey = `kraken-agents/${key}`;
        await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: prefixedKey }));
        const command = new GetObjectCommand({ Bucket: bucket, Key: prefixedKey });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      } catch {
        continue;
      }
    }
  }
  return null;
}

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

      const tmplAgent = templateMatch.agentId ? await getAgentConfig(templateMatch.agentId) : null;
      const tmplIconUrl = tmplAgent?.iconUrl ? await resolveIconUrl(tmplAgent.iconUrl) : null;
      return streamTextResponse(templateMatch.response, templateMatch.agentId, tmplAgent ? { displayName: tmplAgent.displayName, color: tmplAgent.color, iconUrl: tmplIconUrl } : undefined);
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

      const cacheAgent = cacheHit.agent ? await getAgentConfig(cacheHit.agent) : null;
      const cacheIconUrl = cacheAgent?.iconUrl ? await resolveIconUrl(cacheAgent.iconUrl) : null;
      return streamTextResponse(cacheHit.response, cacheHit.agent, cacheAgent ? { displayName: cacheAgent.displayName, color: cacheAgent.color, iconUrl: cacheIconUrl } : undefined);
    }

    // 6. Route to agent
    await emitActivity("routing", { query: message.slice(0, 100) }, {
      userId: user.id,
    });

    const routing = await routeMessage(message.trim());

    // Handle greeting
    if (routing.agent === "kraken_greeting") {
      const greetingResponse = getGreetingResponse();
      await saveAssistantMessage({
        conversationId: conversation.id,
        content: greetingResponse,
        agentId: "kraken_router",
        inputTokens: 0,
        outputTokens: 0,
        cached: false,
        templateUsed: false,
        latencyMs: 0,
      });
      return streamTextResponse(greetingResponse, "kraken_router", { displayName: "Kraken", color: "#534AB7", iconUrl: null });
    }

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
      return streamTextResponse(fallbackResponse, "kraken_router", { displayName: "Kraken", color: "#534AB7", iconUrl: null });
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
      const deniedAgent = await getAgentConfig(routing.agent);
      const deniedIconUrl = deniedAgent?.iconUrl ? await resolveIconUrl(deniedAgent.iconUrl) : null;
      return streamTextResponse(msg, routing.agent, deniedAgent ? { displayName: deniedAgent.displayName, color: deniedAgent.color, iconUrl: deniedIconUrl } : undefined);
    }

    // 8. Execute agent with streaming
    const agentConfig = await getAgentConfig(routing.agent);
    if (!agentConfig) {
      const msg =
        "Este agente está temporariamente desativado. Tente novamente mais tarde.";
      return streamTextResponse(msg, null, { displayName: "Kraken", color: "#534AB7", iconUrl: null });
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
    const resolvedIconUrl = await resolveIconUrl(agentConfig.iconUrl);
    const agentInfoEvent = `data: ${JSON.stringify({
      type: "agent_start",
      data: agentConfig.displayName,
      agent: routing.agent,
      color: agentConfig.color,
      iconUrl: resolvedIconUrl,
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
function streamTextResponse(text: string, agentId: string | null, agentInfo?: { displayName: string; color: string | null; iconUrl: string | null }) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (agentId) {
        const agentEvent = JSON.stringify({
          type: "agent_start",
          data: agentInfo?.displayName || agentId,
          agent: agentId,
          color: agentInfo?.color || "#0126fb",
          iconUrl: agentInfo?.iconUrl || null,
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
