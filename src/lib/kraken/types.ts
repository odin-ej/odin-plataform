import { KrakenAgent, KrakenConversation, KrakenMessage } from "@prisma/client";

// --- Router Types ---

export interface KrakenRouterResult {
  agent: string;
  query_refined: string;
  context_needed: string[];
}

// --- Streaming Types ---

export type KrakenStreamEventType =
  | "routing"
  | "agent_start"
  | "token"
  | "done"
  | "error"
  | "cache_hit"
  | "template_hit";

export interface KrakenStreamChunk {
  type: KrakenStreamEventType;
  data: string;
  agent?: string;
}

// --- Agent Config ---

export interface KrakenAgentConfig {
  id: string;
  displayName: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  requiresRag: boolean;
  ragScope: string[];
  color: string | null;
}

// --- Rate Limit ---

export interface KrakenRateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  tokensRemaining: number;
  tokensLimit: number;
  agentsAllowed: string[]; // empty = all
}

// --- Cache ---

export interface KrakenCacheHit {
  id: string;
  response: string;
  agent: string | null;
  similarity: number;
}

// --- RAG ---

export interface KrakenKnowledgeResult {
  content: string;
  sourceName: string;
  sourceUrl: string | null;
  similarity: number;
  metadata: Record<string, unknown>;
}

// --- Usage / Costs ---

export interface KrakenTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
};

export function calculateCost(
  model: string,
  tokens: { inputTokens: number; outputTokens: number }
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    (tokens.inputTokens / 1_000_000) * pricing.input +
    (tokens.outputTokens / 1_000_000) * pricing.output
  );
}

// --- Request Types ---

export interface KrakenChatRequest {
  message: string;
  conversationId?: string;
}

// --- Conversation with messages ---

export type KrakenConversationWithMessages = KrakenConversation & {
  messages: KrakenMessage[];
  agent: KrakenAgent | null;
};

// --- Activity Stream ---

export type KrakenActivityEventType =
  | "routing"
  | "agent_start"
  | "agent_complete"
  | "cache_hit"
  | "template_hit"
  | "error";
