import { prisma } from "@/db";
import { classifyIntent } from "./claude-client";
import { KrakenRouterResult } from "./types";

/**
 * Detect if a message is a simple greeting.
 */
const GREETING_PATTERNS =
  /^(oi|olá|ola|hey|hello|hi|bom dia|boa tarde|boa noite|e ai|eai|fala|salve|opa|hola|o+i+|o+lá+|tudo bem|como vai)\s*[!.?,]*$/i;

export function isGreeting(message: string): boolean {
  return GREETING_PATTERNS.test(message.trim());
}

export function getGreetingResponse(): string {
  const greetings = [
    "Olá! Sou o Kraken, o assistente inteligente da Empresa JR. Como posso te ajudar hoje?",
    "Oi! Eu sou o Kraken. Pode me perguntar qualquer coisa sobre a empresa, plataforma, estratégia, ou pedir para redigir comunicações!",
    "E aí! Sou o Kraken, estou aqui para ajudar. O que precisa?",
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Build the router system prompt DYNAMICALLY from agents in the database.
 * This way, when you add/remove/rename agents, the router automatically adapts.
 */
async function buildRouterPrompt(): Promise<string> {
  const agents = await prisma.krakenAgent.findMany({
    where: { isActive: true, id: { not: "kraken_router" } },
    select: { id: true, displayName: true, description: true },
    orderBy: { displayName: "asc" },
  });

  const agentList = agents
    .map((a) => `- ${a.id}: ${a.description}`)
    .join("\n");

  const agentIds = agents.map((a) => a.id);

  return `Voce e o Kraken, um roteador inteligente de requisicoes. Sua UNICA funcao e classificar a intencao do usuario e retornar um JSON indicando qual agente deve responder.

Agentes disponiveis:
${agentList}

REGRAS:
1. Analise a mensagem do usuario e escolha o agente MAIS adequado
2. Se a mensagem mencionar acoes na plataforma (reservar, criar, atualizar), use o agente que lida com a plataforma
3. Se mencionar documentos, busca, ou informacoes da empresa, use o agente de conhecimento/documentos
4. Se mencionar estrategia, OKRs, metas, use o agente de estrategia
5. Se pedir para redigir, escrever, comunicar, use o agente de comunicacao
6. Se pedir resumo, sintese, ata, use o agente de sintese
7. Se for sobre dados, metricas, numeros, use o agente de dados
8. Se for sobre conteudo, midia, posts, use o agente de conteudo/midia
9. Se for sobre onboarding, termos, novos membros, use o agente de onboarding
10. Na duvida, escolha o agente cuja descricao mais se aproxima da pergunta

IDs validos: ${JSON.stringify(agentIds)}

Retorne APENAS um JSON valido (sem markdown, sem backticks, sem texto adicional):
{"agent": "id_do_agente", "query_refined": "versao refinada da pergunta", "context_needed": []}`;
}

/**
 * Dynamic keyword router — builds keyword map from agent descriptions in the DB.
 * Falls back to this when the AI router fails.
 */
async function keywordRoute(message: string): Promise<string> {
  const lower = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const agents = await prisma.krakenAgent.findMany({
    where: { isActive: true, id: { not: "kraken_router" } },
    select: { id: true, displayName: true, description: true },
  });

  // Score each agent based on how many words from its description match the message
  let bestAgent = agents[0]?.id ?? "odin_ia";
  let bestScore = 0;

  for (const agent of agents) {
    let score = 0;
    const desc = (agent.description + " " + agent.displayName)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // Extract meaningful words from description (3+ chars)
    const descWords = desc.split(/\s+/).filter((w) => w.length >= 3);

    for (const word of descWords) {
      if (lower.includes(word)) {
        score += 1;
      }
    }

    // Bonus: if the agent's displayName is mentioned directly
    const nameLower = agent.displayName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    if (lower.includes(nameLower)) {
      score += 5;
    }

    // Bonus: if agent ID is mentioned
    if (lower.includes(agent.id.replace(/_/g, " "))) {
      score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent.id;
    }
  }

  return bestAgent;
}

/**
 * Route a user message to the appropriate Kraken agent.
 * Fully dynamic — reads agents from the database.
 */
export async function routeMessage(
  message: string
): Promise<KrakenRouterResult> {
  // Handle greetings directly — no API call needed
  if (isGreeting(message)) {
    return {
      agent: "kraken_greeting",
      query_refined: message,
      context_needed: [],
    };
  }

  // Build router prompt dynamically from DB agents
  const routerPrompt = await buildRouterPrompt();

  try {
    // Classify intent via Haiku
    const result = await classifyIntent(message, routerPrompt);

    // If classification succeeded and agent is valid
    if (result.agent && result.agent !== "kraken_fallback") {
      const targetAgent = await prisma.krakenAgent.findUnique({
        where: { id: result.agent },
      });

      if (targetAgent?.isActive) {
        return result;
      }
    }
  } catch (error) {
    console.error("[Kraken Router] AI classification failed:", error);
  }

  // AI classification failed — use dynamic keyword router
  const keywordAgent = await keywordRoute(message);
  const targetAgent = await prisma.krakenAgent.findUnique({
    where: { id: keywordAgent },
  });

  if (targetAgent?.isActive) {
    return {
      agent: keywordAgent,
      query_refined: message,
      context_needed: targetAgent.requiresRag ? ["rag"] : [],
    };
  }

  // Last resort: find ANY active agent that's not the router
  const anyAgent = await prisma.krakenAgent.findFirst({
    where: { isActive: true, id: { not: "kraken_router" } },
  });

  if (anyAgent) {
    return {
      agent: anyAgent.id,
      query_refined: message,
      context_needed: [],
    };
  }

  return {
    agent: "kraken_fallback",
    query_refined: message,
    context_needed: [],
  };
}

/**
 * Get the fallback response.
 */
export function getFallbackResponse(): string {
  return "Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes ou reformule sua pergunta de outra forma.";
}
