import Anthropic from "@anthropic-ai/sdk";
import { KrakenAgentConfig, KrakenRouterResult, KrakenTokenUsage } from "./types";
import { executeAction } from "./actions/executor";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Classify user intent using the Kraken router (Haiku — cheap & fast).
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

  let text =
    response.content[0].type === "text" ? response.content[0].text : "";

  text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  try {
    const parsed = JSON.parse(text);
    return {
      agent: parsed.agent || "kraken_fallback",
      query_refined: parsed.query_refined || message,
      context_needed: parsed.context_needed || [],
    };
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*"agent"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          agent: parsed.agent || "kraken_fallback",
          query_refined: parsed.query_refined || message,
          context_needed: parsed.context_needed || [],
        };
      } catch {
        // Extraction also failed
      }
    }

    console.warn("[Kraken Router] Failed to parse intent JSON:", text.slice(0, 200));
    return {
      agent: "kraken_fallback",
      query_refined: message,
      context_needed: [],
    };
  }
}

/**
 * Call an agent with streaming + tool execution.
 * Returns a ReadableStream of SSE events and a Promise for the final result.
 *
 * IMPORTANT: There is exactly ONE ReadableStream and ONE execution path.
 * Tool calls are deduplicated — create/update/delete actions only execute once.
 */
export async function callAgentStream(params: {
  agent: KrakenAgentConfig;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
  tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>;
  userId?: string;
  userName?: string;
}): Promise<{
  stream: ReadableStream<Uint8Array>;
  result: Promise<{ fullText: string; usage: KrakenTokenUsage; latencyMs: number }>;
}> {
  const startTime = Date.now();
  let fullText = "";
  const totalUsage: KrakenTokenUsage = { inputTokens: 0, outputTokens: 0 };
  const encoder = new TextEncoder();

  // External resolve/reject for the result promise
  let resolveResult!: (v: { fullText: string; usage: KrakenTokenUsage; latencyMs: number }) => void;
  let rejectResult!: (e: Error) => void;

  const resultPromise = new Promise<{
    fullText: string;
    usage: KrakenTokenUsage;
    latencyMs: number;
  }>((res, rej) => {
    resolveResult = res;
    rejectResult = rej;
  });

  function emit(controller: ReadableStreamDefaultController<Uint8Array>, data: Record<string, unknown>) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  }

  // === SINGLE ReadableStream — the ONLY execution path ===
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let runMessages: any[] = [
          ...params.messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: params.userMessage },
        ];

        const systemConfig = [
          {
            type: "text",
            text: params.systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ];

        // Track executed create actions across ALL loop iterations
        const executedCreateActions = new Set<string>();
        const disableToolsNextIteration = false;

        // Tool use loop — max 3 iterations (query → tool → response)
        for (let iteration = 0; iteration < 3; iteration++) {
          const streamParams: Record<string, unknown> = {
            model: params.agent.model,
            max_tokens: params.agent.maxTokens,
            system: systemConfig,
            messages: runMessages,
          };

          // Only provide tools if we haven't just completed a create action
          if (params.tools && params.tools.length > 0 && !disableToolsNextIteration) {
            streamParams.tools = params.tools;
          }

          console.log(`[Kraken] Iteration ${iteration} | Model: ${params.agent.model} | MaxTokens: ${params.agent.maxTokens} | Tools: ${streamParams.tools ? (streamParams.tools as unknown[]).length : 0} | Messages: ${runMessages.length}`);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const response = await anthropic.messages.create(streamParams as any);

          console.log(`[Kraken] Response stop_reason: ${response.stop_reason} | Content blocks: ${response.content.map((b: {type: string}) => b.type).join(', ')}`);

          // Accumulate usage
          totalUsage.inputTokens += response.usage.input_tokens;
          totalUsage.outputTokens += response.usage.output_tokens;
          const usageAny = response.usage as unknown as Record<string, number>;
          totalUsage.cacheCreationInputTokens =
            (totalUsage.cacheCreationInputTokens ?? 0) +
            (usageAny.cache_creation_input_tokens ?? 0);
          totalUsage.cacheReadInputTokens =
            (totalUsage.cacheReadInputTokens ?? 0) +
            (usageAny.cache_read_input_tokens ?? 0);

          // Find tool_use blocks
          const toolUseBlocks = response.content.filter(
            (b: { type: string }) => b.type === "tool_use"
          );

          // Stream all text blocks to frontend
          for (const block of response.content) {
            if (block.type === "text" && block.text) {
              fullText += block.text;
              emit(controller, { type: "token", data: block.text });
            }
          }

          // If no tool calls or stop_reason is not tool_use → done
          if (toolUseBlocks.length === 0 || response.stop_reason !== "tool_use") {
            break;
          }

          // Execute tool calls
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolResults: any[] = [];
          let executedACreateThisIteration = false;

          for (const toolBlock of toolUseBlocks) {
            const tb = toolBlock as { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

            // Detect mutative actions (create, update, delete)
            const isMutativeAction =
              tb.name.startsWith("criar_") ||
              tb.name.startsWith("enviar_") ||
              tb.name.startsWith("solicitar_") ||
              tb.name === "cancelar_reserva" ||
              tb.name === "atualizar_meta";

            const fingerprint = `${tb.name}:${JSON.stringify(tb.input)}`;

            // DEDUP: Skip if this exact mutative action was already executed
            if (isMutativeAction && executedCreateActions.has(fingerprint)) {
              toolResults.push({
                type: "tool_result",
                tool_use_id: tb.id,
                content: "✅ Esta ação já foi executada com sucesso nesta conversa.",
              });
              continue;
            }

            // Notify frontend
            emit(controller, {
              type: "action_executing",
              data: { toolName: tb.name, input: tb.input },
            });

            // Execute the action
            console.log(`[Kraken Tool] Executing: ${tb.name}`, JSON.stringify(tb.input).slice(0, 200));
            const actionResult = await executeAction(
              tb.name,
              tb.input,
              { userId: params.userId || "", userName: params.userName || "" }
            );
            console.log(`[Kraken Tool] Result: ${actionResult.success ? 'SUCCESS' : 'FAILED'} — ${actionResult.message.slice(0, 100)}`);

            // Notify frontend of result
            emit(controller, {
              type: "action_result",
              data: {
                toolName: tb.name,
                success: actionResult.success,
                message: actionResult.message,
              },
            });

            toolResults.push({
              type: "tool_result",
              tool_use_id: tb.id,
              content: actionResult.message,
            });

            // Track successful mutative actions
            if (isMutativeAction && actionResult.success) {
              executedCreateActions.add(fingerprint);
              executedACreateThisIteration = true;
            }
          }

          // If we executed a mutative action (create/update/delete), STOP the loop.
          // Append the action result to fullText so it gets saved in the conversation.
          if (executedACreateThisIteration) {
            // Add action results to the saved text so reloading shows the full response
            for (const tr of toolResults) {
              const content = typeof tr.content === "string" ? tr.content : "";
              if (content && !content.startsWith("✅ Esta ação já foi")) {
                const separator = fullText.endsWith("\n") ? "" : "\n\n";
                fullText += separator + content;
                emit(controller, { type: "token", data: separator + content });
              }
            }
            break;
          }

          // Only continue loop for read-only tool calls (list rooms, list tasks, etc.)
          runMessages = [
            ...runMessages,
            { role: "assistant", content: response.content },
            { role: "user", content: toolResults },
          ];
        }

        emit(controller, { type: "done", data: "" });
        controller.close();
        resolveResult({ fullText, usage: totalUsage, latencyMs: Date.now() - startTime });
      } catch (err) {
        emit(controller, { type: "error", data: err instanceof Error ? err.message : "Unknown error" });
        controller.close();
        rejectResult(err instanceof Error ? err : new Error(String(err)));
      }
    },
  });

  return { stream, result: resultPromise };
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
