import prisma from "@/db";
import { callAgentStream } from "./claude-client";
import { getConversationContext } from "./conversation-manager";
import { searchKnowledge, formatRagContext } from "./rag/retriever";
import { KrakenAgentConfig } from "./types";

// In-memory agent config cache (60s TTL)
const agentCache = new Map<string, { config: KrakenAgentConfig; timestamp: number }>();
const CACHE_TTL_MS = 60_000;

/**
 * Load agent config from DB with in-memory caching.
 */
export async function getAgentConfig(
  agentId: string
): Promise<KrakenAgentConfig | null> {
  const cached = agentCache.get(agentId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.config;
  }

  const agent = await prisma.krakenAgent.findUnique({
    where: { id: agentId },
  });

  if (!agent || !agent.isActive) return null;

  const config: KrakenAgentConfig = {
    id: agent.id,
    displayName: agent.displayName,
    model: agent.model,
    maxTokens: agent.maxTokens,
    systemPrompt: agent.systemPrompt,
    requiresRag: agent.requiresRag,
    ragScope: agent.ragScope,
    color: agent.color,
  };

  agentCache.set(agentId, { config, timestamp: Date.now() });
  return config;
}

/**
 * Build the full system prompt for an agent, injecting RAG context
 * and user permissions where applicable.
 */
async function buildSystemPrompt(
  agent: KrakenAgentConfig,
  query: string,
  userId: string
): Promise<string> {
  let prompt = agent.systemPrompt;

  // Inject RAG context if needed
  if (agent.requiresRag && agent.ragScope.length > 0) {
    const ragResults = await searchKnowledge(query, agent.id);
    const ragContext = formatRagContext(ragResults);
    prompt = prompt.replace("{RAG_CONTEXT}", ragContext);
  } else {
    prompt = prompt.replace("{RAG_CONTEXT}", "Nenhum contexto adicional disponível.");
  }

  // Inject user permissions context
  if (prompt.includes("{USER_PERMISSIONS}")) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true, currentRole: true },
    });

    const permissionsContext = user
      ? `Usuário: ${user.name}\nCargo atual: ${user.currentRole?.name ?? "Sem cargo"}\nÁreas: ${user.roles.flatMap((r) => r.area).join(", ")}`
      : "Informações do usuário não disponíveis.";

    prompt = prompt.replace("{USER_PERMISSIONS}", permissionsContext);
  }

  return prompt;
}

/**
 * Execute an agent with streaming.
 * This is the main entry point for agent execution.
 */
export async function executeAgent(params: {
  agentId: string;
  query: string;
  conversationId: string;
  userId: string;
}): Promise<{
  stream: ReadableStream<Uint8Array>;
  result: Promise<{
    fullText: string;
    usage: { inputTokens: number; outputTokens: number };
    latencyMs: number;
  }>;
}> {
  const agent = await getAgentConfig(params.agentId);
  if (!agent) {
    throw new Error(`Agent ${params.agentId} not found or inactive`);
  }

  // Build system prompt with RAG + permissions
  const systemPrompt = await buildSystemPrompt(
    agent,
    params.query,
    params.userId
  );

  // Get conversation history (sliding window + summary)
  const { summary, recentMessages } = await getConversationContext(
    params.conversationId
  );

  // Build messages array with optional summary
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (summary) {
    messages.push({
      role: "user",
      content: `[Resumo da conversa anterior: ${summary}]`,
    });
    messages.push({
      role: "assistant",
      content: "Entendido, tenho o contexto da conversa anterior.",
    });
  }

  messages.push(...recentMessages);

  // Execute with streaming
  return callAgentStream({
    agent,
    systemPrompt,
    messages,
    userMessage: params.query,
  });
}
