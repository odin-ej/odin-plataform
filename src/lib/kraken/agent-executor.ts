import { prisma } from "@/db";
import { callAgentStream } from "./claude-client";
import { getConversationContext } from "./conversation-manager";
import { searchKnowledge, formatRagContext } from "./rag/retriever";
import { KrakenAgentConfig } from "./types";
import { getOdinToolDefinitions } from "./odin-actions";

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
    iconUrl: agent.iconUrl,
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

  // Inject current date/time context (critical for date-aware actions)
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const tomorrowDate = new Date(ty, tm - 1, td + 1);
  const tomorrowStr = tomorrowDate.toLocaleDateString("en-CA");
  prompt += `\n\n# CONTEXTO TEMPORAL\nData e hora atual: ${dateStr}, ${now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}\nHoje em formato ISO: ${todayStr}\nAmanhã em formato ISO: ${tomorrowStr}\nANO ATUAL: ${now.getFullYear()}\nUSE SEMPRE estas datas quando o usuário disser "hoje" ou "amanhã". NUNCA invente datas.`;

  // Inject RAG context if needed
  if (agent.requiresRag && agent.ragScope.length > 0) {
    const ragResults = await searchKnowledge(query, agent.id);
    const ragContext = formatRagContext(ragResults);
    console.log(`[RAG] Agent: ${agent.id} | Query: "${query.slice(0, 50)}" | Results: ${ragResults.length} | Context length: ${ragContext.length} chars`);
    if (ragResults.length > 0) {
      console.log(`[RAG] Sources: ${[...new Set(ragResults.map(r => r.sourceName))].join(', ').slice(0, 200)}`);
      console.log(`[RAG] First 500 chars of context:\n${ragContext.slice(0, 500)}`);
    }
    prompt = prompt.replace("{RAG_CONTEXT}", ragContext);
  } else {
    prompt = prompt.replace("{RAG_CONTEXT}", "Nenhum contexto adicional disponível.");
  }

  // Inject live PEP strategy data (macro objectives + goals from DB)
  if (agent.id === "horus_ia" || prompt.includes("{STRATEGY_DATA}")) {
    try {
      const plan = await prisma.estrategyPlan.findFirst({
        include: {
          estrategyObjectives: { include: { goals: true } },
        },
      });
      if (plan) {
        const objectives = plan.estrategyObjectives.map((obj) => {
          const goalsText = obj.goals.map((g) =>
            `  - ${g.title}: meta ${g.goal}, atual ${g.value} (${Number(g.value) > 0 && Number(g.goal) > 0 ? ((Number(g.value) / Number(g.goal)) * 100).toFixed(1) + "%" : "sem dados"})`
          ).join("\n");
          return `### ${obj.objective}\n${obj.description}\n${goalsText}`;
        }).join("\n\n");

        const pepContext = `\n\n# PEP (Planejamento Estratégico) — DADOS ATUAIS DA PLATAFORMA\n## Missão: ${plan.mission}\n## Visão: ${plan.vision}\n\n## Objetivos Macro e Indicadores\n${objectives}\n\n⚠️ Estes são os objetivos MACRO do PEP. Os OKRs por ÁREA (DOPER, DMER, DPJTS, DPES, etc) estão nos Repasses Hórus e Painéis de Bordo disponíveis via RAG acima. Sempre priorize os dados mais RECENTES (2026 sobre 2025).`;

        prompt += pepContext;
        prompt = prompt.replace("{STRATEGY_DATA}", pepContext);
      }
    } catch (err) {
      console.warn("[Agent] Failed to load PEP data:", (err as Error).message);
    }
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

  // Get tools for odin_ia agent (platform actions)
  const tools = params.agentId === "odin_ia" ? getOdinToolDefinitions() : undefined;

  // Get user name for action context
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true },
  });

  // Execute with streaming
  return callAgentStream({
    agent,
    systemPrompt,
    messages,
    userMessage: params.query,
    tools,
    userId: params.userId,
    userName: user?.name || "",
  });
}
