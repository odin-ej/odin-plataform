import { prisma } from "@/db";
import { callAgent } from "./claude-client";

const MAX_RECENT_MESSAGES = 6;

/**
 * Get or create a conversation for a user.
 */
export async function getOrCreateConversation(
  conversationId: string | undefined,
  userId: string
) {
  if (conversationId) {
    const existing = await prisma.krakenConversation.findFirst({
      where: { id: conversationId, userId, isActive: true },
      include: { messages: { orderBy: { createdAt: "asc" } }, agent: true },
    });
    if (existing) return existing;
  }

  // Create new conversation
  return prisma.krakenConversation.create({
    data: { userId },
    include: { messages: true, agent: true },
  });
}

/**
 * Get conversation context for the agent: summary + recent messages.
 * Implements sliding window with summarization.
 */
export async function getConversationContext(conversationId: string): Promise<{
  summary: string | null;
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
}> {
  const conversation = await prisma.krakenConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return { summary: null, recentMessages: [] };
  }

  const messages = conversation.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  if (messages.length <= MAX_RECENT_MESSAGES) {
    return { summary: conversation.summary, recentMessages: messages };
  }

  const recentMessages = messages.slice(-MAX_RECENT_MESSAGES);

  // Check if we need to summarize older messages
  const unsummarized = messages.slice(0, -MAX_RECENT_MESSAGES);
  let summary = conversation.summary;

  if (unsummarized.length > 0) {
    summary = await summarizeMessages(unsummarized, conversation.summary);
    await prisma.krakenConversation.update({
      where: { id: conversationId },
      data: { summary },
    });
  }

  return { summary, recentMessages };
}

/**
 * Summarize older messages using Haiku (cheap).
 */
async function summarizeMessages(
  messages: Array<{ role: string; content: string }>,
  existingSummary: string | null
): Promise<string> {
  const messagesText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const result = await callAgent({
    model: "claude-haiku-4-5-20251001",
    maxTokens: 300,
    systemPrompt:
      "Resuma esta conversa em um parágrafo conciso, mantendo os pontos-chave e decisões. Se há um resumo anterior, integre as novas informações. Responda apenas com o resumo, sem prefixo.",
    userMessage: `${existingSummary ? `Resumo anterior: ${existingSummary}\n\n` : ""}Novas mensagens:\n${messagesText}`,
  });

  return result.text;
}

/**
 * Save a user message to the conversation.
 */
export async function saveUserMessage(
  conversationId: string,
  content: string
) {
  return prisma.krakenMessage.create({
    data: {
      conversationId,
      content,
      role: "user",
    },
  });
}

/**
 * Save an assistant message to the conversation.
 */
export async function saveAssistantMessage(params: {
  conversationId: string;
  content: string;
  agentId: string;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
  templateUsed: boolean;
  latencyMs: number | null;
}) {
  return prisma.krakenMessage.create({
    data: {
      conversationId: params.conversationId,
      content: params.content,
      role: "assistant",
      agentId: params.agentId,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cached: params.cached,
      templateUsed: params.templateUsed,
      latencyMs: params.latencyMs,
    },
  });
}

/**
 * Update conversation metadata after a response.
 */
export async function updateConversationAfterResponse(params: {
  conversationId: string;
  agentId: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  firstMessage?: string;
}) {
  const conversation = await prisma.krakenConversation.findUnique({
    where: { id: params.conversationId },
  });

  const updateData: Record<string, unknown> = {
    agentId: params.agentId,
    modelUsed: params.model,
    totalInputTokens: (conversation?.totalInputTokens ?? 0) + params.inputTokens,
    totalOutputTokens: (conversation?.totalOutputTokens ?? 0) + params.outputTokens,
  };

  // Auto-generate smart title from first user message using Haiku (cheap & fast)
  if (!conversation?.title && params.firstMessage) {
    // Set a temporary title immediately (so UI shows something)
    updateData.title = params.firstMessage.slice(0, 60);

    // Generate a smart title async (non-blocking)
    generateSmartTitle(params.conversationId, params.firstMessage).catch(() => {});
  }

  await prisma.krakenConversation.update({
    where: { id: params.conversationId },
    data: updateData,
  });
}

/**
 * Generate a smart title for a conversation using Haiku.
 * Runs async so it doesn't block the response.
 */
async function generateSmartTitle(conversationId: string, firstMessage: string) {
  try {
    const result = await callAgent({
      model: "claude-haiku-4-5-20251001",
      maxTokens: 30,
      systemPrompt:
        "Gere um titulo CURTO (maximo 6 palavras) para esta conversa. " +
        "O titulo deve resumir o assunto principal. " +
        "NAO use aspas, NAO use emoji, NAO use pontuacao final. " +
        "Exemplos: 'Reserva sala de talentos', 'OKRs janeiro 2026', 'Duvida sobre FECS', 'Redigir email comercial'. " +
        "Responda APENAS com o titulo, nada mais.",
      userMessage: firstMessage,
    });

    const title = result.text
      .replace(/^["']|["']$/g, "") // remove quotes
      .replace(/\.+$/, "") // remove trailing dots
      .trim()
      .slice(0, 80);

    if (title.length > 2) {
      await prisma.krakenConversation.update({
        where: { id: conversationId },
        data: { title },
      });
    }
  } catch {
    // Silent fail — temporary title from firstMessage is already set
  }
}

/**
 * List conversations for a user.
 */
export async function listConversations(
  userId: string,
  page = 1,
  pageSize = 20
) {
  const [conversations, total] = await Promise.all([
    prisma.krakenConversation.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { agent: { select: { id: true, displayName: true, color: true } } },
    }),
    prisma.krakenConversation.count({ where: { userId, isActive: true } }),
  ]);

  return { conversations, total, page, pageSize };
}
