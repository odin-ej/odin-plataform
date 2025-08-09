import { prisma } from "@/db";
import { googleSearch, googleSearchTool } from "@/lib/ai-tools";
import {
  checkCommonMessages,
  simpleKeywords,
  toolKeywords,
} from "@/lib/ai-utils";
import { embeddingModel, geminiFlash, geminiPro } from "@/lib/gemini";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import {
  getAuthenticatedUser,
  getConversationHistory,
} from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { Part } from "@google/generative-ai";
import { isSameDay } from "date-fns";
import { NextResponse } from "next/server";
import type { Tool } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
import { normalizeString } from "@/lib/format";

const tools: Tool[] = [
  {
    functionDeclarations: [googleSearchTool],
  },
];

const systemPrompt = `
Você é Hórus IA, um assistente de inteligência artificial exclusivamente para a Empresa Junior ADM UFBA. 
O seu propósito é ajudar os membros da Empresa Junior ADM UFBA a encontrar informações, analisar dados e impulsionar os sonhos da empresa.
Responda sempre de forma prestativa, profissional e alinhada com os valores da empresa: Ser sốcio, Inquietação, Só faça, Envolvimento, Sintonia, Só faça e Donos de Sonhos.
Quando um utilizador fizer uma pergunta, responda como se fosse Hórus IA. Não repita sua identidade mais de uma vez, sem que o usuário peça. Se apresente inicialmente, mas depois não repita, a não ser que o usuário peça isso.
`;

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 5; // 50MB

const getModelForPrompt = (prompt: string, forcePro = false) => {
  if (forcePro) return geminiPro;

  const isSimple = simpleKeywords.some((kw) =>
    prompt.toLowerCase().includes(kw)
  );

  return isSimple ? geminiFlash : geminiPro;
};

const shouldUseTools = (prompt: string) => {
  const normalized = normalizeString(prompt);
  return toolKeywords.some((kw) => normalized.includes(normalizeString(kw)));
};

async function generateTitle(prompt: string): Promise<string> {
  const titlePrompt = `Gere um título curto e conciso (máximo 5 palavras, sem aspas) para a seguinte pergunta: "${prompt}"`;
  const titleResult = await geminiFlash.generateContent(titlePrompt);
  return titleResult.response.text().replace(/"/g, "").trim();
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { prompt, conversationId, fileData } = await request.json();
    if (!prompt)
      return NextResponse.json(
        { message: "A pergunta é obrigatória." },
        { status: 400 }
      );

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { roles: true },
    });
    if (!user)
      return NextResponse.json(
        { message: "Perfil não encontrado." },
        { status: 404 }
      );

    const isDirector = checkUserPermission(user, DIRECTORS_ONLY);
    const messageLimit = isDirector ? 40 : 20;
    const today = new Date();
    let currentCount = user.dailyMessageCount;

    if (user.lastMessageDate && isSameDay(user.lastMessageDate, today)) {
      if (currentCount >= messageLimit) {
        return NextResponse.json(
          { message: "Você atingiu o seu limite de mensagens diárias." },
          { status: 429 }
        );
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
      revalidatePath(`/chat/${conversationId}`);
      return NextResponse.json({ response: handled });
    }

    const embedding = await embeddingModel.embedContent(prompt);
    const vector = embedding.embedding.values;

    const contextChunks: { content: string }[] = await prisma.$queryRaw`
      SELECT content FROM "KnowledgeChunk" 
      ORDER BY embedding <-> ${vector}::vector 
      LIMIT 3
    `;

    const context = contextChunks.map((c) => c.content).join("\n---\n");
    const finalPrompt = `${systemPrompt}

        --- CONTEXTO RELEVANTE DA EMPRESA ---
        ${context}

        --- PERGUNTA DO USUÁRIO ---
        ${prompt}
      `;

    const modelParts: Part[] = [{ text: finalPrompt }];

    if (fileData) {
      const estimatedSize = (fileData.base64.length * 3) / 4;
      if (estimatedSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { message: "Arquivo muito grande." },
          { status: 413 }
        );
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
      ...(useTools && { tools }),
    });

    const result = await chat.sendMessage(modelParts);
    let aiResponse = result.response.text().trim();
    const functionCall = result.response.candidates?.[0]?.content?.parts?.find(
      (p) => "functionCall" in p
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
      return NextResponse.json(
        { message: "Resposta da IA vazia." },
        { status: 502 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { title: true },
    });

    let updatedTitle: string | null = null;
    if (!conversation?.title || conversation.title === "Nova Conversa") {
      updatedTitle = await generateTitle(prompt);
    }
    console.log(updatedTitle);

    await prisma.$transaction(async (tx) => {
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
    });
    revalidatePath(`/chat/${conversationId}`);
    return NextResponse.json({
      response: aiResponse,
      ...(updatedTitle && { title: updatedTitle }),
    });
  } catch (error) {
    console.error("Erro na API de chat:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro ao processar o seu pedido." },
      { status: 500 }
    );
  }
}
