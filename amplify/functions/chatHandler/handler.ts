/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Part, Tool } from "@google/generative-ai";
import { isSameDay } from "date-fns";

// --- Nossos Módulos da Lambda Layer ---
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import {
  createResponse,
  checkUserPermission,
  normalizeString,
} from "../shared/utils";
import { embeddingModel, geminiFlash, geminiPro } from "../shared/gemini";
import { googleSearch, googleSearchTool } from "../shared/ai-tools";
import {
  checkCommonMessages,
  simpleKeywords,
  toolKeywords,
} from "../shared/ai-utils";
import { getConversationHistory } from "../shared/chat-utils";
import { DIRECTORS_ONLY } from "../shared/permissions";

const tools: Tool[] = [
  {
    functionDeclarations: [googleSearchTool],
  },
];

const systemPrompt = `
Você é Hórus IA, um assistente de inteligência artificial para a Empresa Júnior ADM UFBA. 
O seu propósito é ajudar os membros a encontrar informações, analisar dados e impulsionar os sonhos da empresa.
Responda sempre de forma prestativa, profissional e alinhada com os valores da empresa: Ser sốcio (abraçar a causa da empresa), Inquietação (espírito de inovação), Só faça (proatividade), Envolvimento (participação), Sintonia (colaboração), Donos de sonhos (entender a importância dos cases da empresa).
Quando um utilizador fizer uma pergunta, responda como se fosse Hórus IA.
`;

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 2; // 20MB

const getModelForPrompt = (prompt: string, forcePro = false) => {
  if (forcePro) return geminiPro;

  const isSimple = simpleKeywords.some((kw: string) =>
    prompt.toLowerCase().includes(kw)
  );

  return isSimple ? geminiFlash : geminiPro;
};

const shouldUseTools = (prompt: string) => {
  const normalized = normalizeString(prompt);
  return toolKeywords.some((kw: any) =>
    normalized.includes(normalizeString(kw))
  );
};

async function generateTitle(prompt: string): Promise<string> {
  const titlePrompt = `Gere um título curto e conciso (máximo 5 palavras, sem aspas) para a seguinte pergunta: "${prompt}"`;
  const titleResult = await geminiFlash.generateContent(titlePrompt);
  return titleResult.response.text().replace(/"/g, "").trim();
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const { prompt, conversationId, fileData } = JSON.parse(event.body);

    if (!prompt)
      return createResponse(400, { message: "A pergunta é obrigatória." });
    const prisma = await getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { roles: true },
    });
    if (!user)
      return createResponse(404, { response: "Perfin não encontrado." });

    const isDirector = checkUserPermission(user, DIRECTORS_ONLY);
    const messageLimit = isDirector ? 40 : 20;
    const today = new Date();
    let currentCount = user.dailyMessageCount;

    if (user.lastMessageDate && isSameDay(user.lastMessageDate, today)) {
      if (currentCount >= messageLimit) {
        return createResponse(429, {
          response: "Você atingiu o seu limite de mensagens diárias.",
        });
      }
    } else {
      currentCount = 0;
    }

    const normalizedPrompt = normalizeString(prompt);
    const handled = checkCommonMessages(normalizedPrompt);
    if (handled) {
      await prisma.message.createMany({
        data: [
          { role: "user", content: prompt, conversationId },
          { role: "model", content: handled, conversationId },
        ],
      });
      return createResponse(200, { response: handled });
    }

    const embedding = await embeddingModel.embedContent(prompt);
    const vector = embedding.embedding.values;

    const contextChunks: { content: string }[] = await prisma.$queryRaw`
              SELECT content FROM "KnowledgeChunk" 
              ORDER BY embedding <-> ${vector}::vector 
              LIMIT 3
            `;

    const context = contextChunks.map((c) => c.content).join("\n---\n");
    const finalPrompt = `Com base no seguinte contexto da nossa empresa:\n\n${context}\n\nResponda à pergunta do utilizador: "${prompt}"`;

    const modelParts: Part[] = [{ text: finalPrompt }];

    if (fileData) {
      const estimatedSize = (fileData.base64.length * 3) / 4;
      if (estimatedSize > MAX_FILE_SIZE) {
        return createResponse(413, { response: "Arquivo muito grande." });
      }
      modelParts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64,
        },
      });
    }

    const history = await getConversationHistory(conversationId);
    while (history.length > 0 && history[0].role !== "user") {
      history.shift();
    }
    if (
      history.length % 2 !== 0 &&
      history[history.length - 1].role === "model"
    ) {
      history.pop();
    }
    if (history.length > 0 && history[history.length - 1].role === "model") {
      history.pop();
    }
    const useTools = shouldUseTools(prompt);

    const model = getModelForPrompt(prompt, useTools);
    const chat = model.startChat({
      history,
      systemInstruction: systemPrompt,
      ...(useTools && { tools }),
    });

    const result = await chat.sendMessage(modelParts);
    let aiResponse = result.response.text().trim();
    const functionCall = result.response.candidates?.[0]?.content?.parts?.find(
      (p: any) => "functionCall" in p
    )?.functionCall;

    // Se a IA solicitar a ferramenta
    if (functionCall?.name === "searchGoogle") {
      const searchResult = await googleSearch(
        functionCall.args as { query: string }
      );

      const result2 = await chat.sendMessage([
        {
          functionResponse: {
            name: "googleSearch",
            response: { content: searchResult },
          },
        },
      ]);

      aiResponse = result2.response.text().trim();
    }

    // Se deveria usar ferramenta mas não usou — reforço
    if (useTools && !functionCall && !aiResponse.includes("google")) {
      const retry = await chat.sendMessage([
        {
          text: `Use a ferramenta googleSearch para buscar as informações mais recentes antes de responder.`,
        },
      ]);

      const retryCall =
        retry.response.candidates?.[0]?.content?.parts?.[0]?.functionCall;

      if (retryCall?.name === "googleSearch") {
        const searchResult = await googleSearch(
          retryCall.args as { query: string }
        );

        const retryResponse = await chat.sendMessage([
          {
            functionResponse: {
              name: "googleSearch",
              response: { content: searchResult },
            },
          },
        ]);

        aiResponse = retryResponse.response.text().trim();
      }
    }

    if (!aiResponse) {
      return createResponse(502, { response: "Resposta da IA vazia." });
    }

    const messageCount = await prisma.message.count({
      where: { conversationId, role: "user" },
    });

    let updatedTitle: string | null = null;
    if (messageCount === 0) {
      updatedTitle = await generateTitle(prompt);
    }

    await prisma.$transaction(
      async (tx: {
        message: {
          createMany: (arg0: {
            data: { role: string; content: any; conversationId: any }[];
          }) => any;
        };
        conversation: {
          update: (arg0: {
            where: { id: any };
            data: { updatedAt: Date; title?: string };
          }) => any;
        };
        user: {
          update: (arg0: {
            where: { id: any };
            data: {
              dailyMessageCount: { increment: number };
              lastMessageDate: Date;
            };
          }) => any;
        };
      }) => {
        await tx.message.createMany({
          data: [
            { role: "user", content: prompt, conversationId },
            { role: "model", content: aiResponse, conversationId },
          ],
        });

        const updateData: { updatedAt: Date; title?: string } = {
          updatedAt: new Date(),
        };
        if (updatedTitle) updateData.title = updatedTitle;

        await tx.conversation.update({
          where: { id: conversationId },
          data: updateData,
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            dailyMessageCount: { increment: 1 },
            lastMessageDate: new Date(),
          },
        });
      }
    );

    return createResponse(200, { response: aiResponse });
  } catch (error: any) {
    console.error("Erro na API de chat:", error);
    return createResponse(500, {
      message: "Ocorreu um erro ao processar o seu pedido.",
      error: error.message,
    });
  }
};
