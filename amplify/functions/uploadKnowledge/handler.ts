import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { embeddingModel } from "../shared/gemini"; // Supondo que o cliente Gemini está na Layer
import { createResponse } from "../shared/utils";
import pdf from "pdf-parse";
import multipart from "lambda-multipart-parser"; // Para lidar com form-data

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const result = await multipart.parse(event);
    const file = result.files[0];

    if (!file) {
      return createResponse(400, { message: "Nenhum ficheiro enviado." });
    }
    if (file.content.length > 30 * 1024 * 1024) {
      return createResponse(400, {
        message: "Arquivo muito grande (máx. 30MB).",
      });
    }

    let textContent = "";
    if (file.contentType === "application/pdf") {
      const data = await pdf(file.content);
      textContent = data.text;
    } else {
      textContent = file.content.toString("utf-8");
    }

    if (!textContent.trim()) {
      return createResponse(400, {
        message: "O ficheiro está vazio ou ilegível.",
      });
    }

    const chunks = textContent.match(/.{1,1500}/gs) || [];
    if (chunks.length === 0) {
      return createResponse(400, {
        message: "Não foi possível extrair conteúdo do ficheiro.",
      });
    }

    const embeddingResult = await embeddingModel.batchEmbedContents({
      requests: chunks.map((chunk) => ({
        model: "models/embedding-004",
        content: { role: "user", parts: [{ text: chunk }] },
      })),
    });

    const embeddings = embeddingResult.embeddings.map((e) => e.values);
    const dataToInsert = chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
    }));
    const prisma = await getPrismaClient();

    await prisma.$transaction(
      dataToInsert.map(
        (item) =>
          prisma.$executeRaw`
          INSERT INTO "KnowledgeChunk" (id, content, embedding)
          VALUES (gen_random_uuid(), ${item.content}, ${item.embedding}::vector)
        `
      )
    );

    return createResponse(200, {
      message: `✅ Ficheiro processado com sucesso! ${chunks.length} pedaços foram adicionados.`,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("❌ Erro ao processar ficheiro de conhecimento:", error);
    return createResponse(500, {
      message: "Erro ao processar o ficheiro.",
      error: error.message,
    });
  }
};
