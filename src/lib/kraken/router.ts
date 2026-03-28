import prisma from "@/db";
import { classifyIntent } from "./claude-client";
import { KrakenRouterResult } from "./types";

/**
 * Route a user message to the appropriate Kraken agent.
 *
 * 1. Load the kraken_router agent's system prompt from DB
 * 2. Call Haiku to classify intent
 * 3. Validate the target agent exists and is active
 * 4. Fallback to generic response if needed
 */
export async function routeMessage(
  message: string
): Promise<KrakenRouterResult> {
  // Load router agent config
  const routerAgent = await prisma.krakenAgent.findUnique({
    where: { id: "kraken_router" },
  });

  if (!routerAgent || !routerAgent.isActive) {
    return {
      agent: "kraken_fallback",
      query_refined: message,
      context_needed: [],
    };
  }

  // Classify intent via Haiku
  const result = await classifyIntent(message, routerAgent.systemPrompt);

  // Validate the target agent exists and is active
  if (result.agent !== "kraken_fallback") {
    const targetAgent = await prisma.krakenAgent.findUnique({
      where: { id: result.agent },
    });

    if (!targetAgent || !targetAgent.isActive) {
      return {
        agent: "kraken_fallback",
        query_refined: result.query_refined,
        context_needed: [],
      };
    }
  }

  return result;
}

/**
 * Get the fallback response when no agent can handle the request.
 */
export function getFallbackResponse(): string {
  return "Desculpe, não consegui entender sua solicitação. Poderia reformular sua pergunta? Posso ajudar com:\n\n- **Plataforma Odin** — como usar funcionalidades\n- **Documentos** — buscar políticas e processos\n- **Estratégia** — OKRs, squads, FECs\n- **Comunicação** — redigir emails e mensagens\n- **Resumos** — sintetizar textos e atas\n- **Onboarding** — primeiros passos na empresa\n- **Dados** — análise de métricas\n- **Conteúdo** — planejamento de mídia";
}
