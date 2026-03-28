import Anthropic from "@anthropic-ai/sdk";
import { KrakenAgentConfig, KrakenRouterResult, KrakenTokenUsage } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Classify user intent using the Kraken router (Haiku — cheap & fast).
 * Returns which agent should handle the request.
 */
export async function classifyIntent(
  message: string,
  routerPrompt: string
): Promise<KrakenRouterResult> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: [
      {
        type: "text",
        text: routerPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: message }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return {
      agent: parsed.agent || "kraken_fallback",
      query_refined: parsed.query_refined || message,
      context_needed: parsed.context_needed || [],
    };
  } catch {
    return {
      agent: "kraken_fallback",
      query_refined: message,
      context_needed: [],
    };
  }
}

/**
 * Call an agent with streaming. Returns a ReadableStream of SSE events
 * and a promise that resolves with the full response + token usage.
 */
export async function callAgentStream(params: {
  agent: KrakenAgentConfig;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
}): Promise<{
  stream: ReadableStream<Uint8Array>;
  result: Promise<{ fullText: string; usage: KrakenTokenUsage; latencyMs: number }>;
}> {
  const startTime = Date.now();
  let fullText = "";
  let usage: KrakenTokenUsage = { inputTokens: 0, outputTokens: 0 };

  const allMessages = [
    ...params.messages,
    { role: "user" as const, content: params.userMessage },
  ];

  const anthropicStream = anthropic.messages.stream({
    model: params.agent.model,
    max_tokens: params.agent.maxTokens,
    system: [
      {
        type: "text",
        text: params.systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: allMessages,
  });

  const encoder = new TextEncoder();

  const result = new Promise<{
    fullText: string;
    usage: KrakenTokenUsage;
    latencyMs: number;
  }>((resolve, reject) => {
    anthropicStream.on("finalMessage", (message) => {
      usage = {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheCreationInputTokens:
          (message.usage as Record<string, number>).cache_creation_input_tokens ?? 0,
        cacheReadInputTokens:
          (message.usage as Record<string, number>).cache_read_input_tokens ?? 0,
      };
      resolve({
        fullText,
        usage,
        latencyMs: Date.now() - startTime,
      });
    });

    anthropicStream.on("error", (err) => {
      reject(err);
    });
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullText += text;
            const sseData = JSON.stringify({ type: "token", data: text });
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          }
        }
        const doneData = JSON.stringify({ type: "done", data: "" });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
        controller.close();
      } catch (err) {
        const errorData = JSON.stringify({
          type: "error",
          data: err instanceof Error ? err.message : "Unknown error",
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return { stream, result };
}

/**
 * Call an agent without streaming (for summarization, etc).
 */
export async function callAgent(params: {
  model: string;
  maxTokens: number;
  systemPrompt: string;
  userMessage: string;
}): Promise<{ text: string; usage: KrakenTokenUsage }> {
  const response = await anthropic.messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    system: params.systemPrompt,
    messages: [{ role: "user", content: params.userMessage }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return {
    text,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
