import { prisma } from "@/db";
import { embeddingModel } from "@/lib/gemini";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { NextResponse } from "next/server";
import pdf from "pdf-parse";

export const runtime = "nodejs";

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

    if (!hasPermission)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "Nenhum ficheiro enviado." },
        { status: 400 }
      );
    }

    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { message: "Arquivo muito grande (máx. 100MB)." },
        { status: 400 }
      );
    }

    // CORREÇÃO: Lê o conteúdo do ficheiro para um Buffer do Node.js
    // usando a função auxiliar, que é mais fiável do que file.arrayBuffer() neste contexto.
    const fileBuffer = await streamToBuffer(file.stream());

    let textContent = "";

    if (file.type === "application/pdf") {
      const data = await pdf(fileBuffer);
      textContent = data.text;
    } else {
      textContent = fileBuffer.toString("utf-8");
    }

    if (!textContent.trim()) {
      return NextResponse.json(
        { message: "O ficheiro está vazio ou ilegível." },
        { status: 400 }
      );
    }

    // Divide o texto em pedaços (chunks)
    const chunks = textContent.match(/.{1,1500}/gs) || [];
    if (chunks.length === 0) {
      return NextResponse.json(
        { message: "Não foi possível extrair conteúdo do ficheiro." },
        { status: 400 }
      );
    }

    // Gera os embeddings em batch
    const result = await embeddingModel.batchEmbedContents({
      requests: chunks.map((chunk) => ({
        model: "models/embedding-004",
        content: {
          role: "user",
          parts: [{ text: chunk }],
        },
      })),
    });

    console.log("✅ Embeddings gerados");

    const embeddings = result.embeddings.map((e) => e.values);

    // Prepara os dados para o banco
    const dataToInsert = chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
    }));

    // Insere no banco via Prisma
    await prisma.$transaction(
      dataToInsert.map(
        (item) =>
          prisma.$executeRaw`
          INSERT INTO "KnowledgeChunk" (id, content, embedding)
          VALUES (gen_random_uuid(), ${item.content}, ${item.embedding}::vector)
        `
      )
    );

    return NextResponse.json({
      message: `✅ Ficheiro processado com sucesso! ${chunks.length} pedaços foram adicionados.`,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("❌ Erro ao processar ficheiro de conhecimento:", error);
    return NextResponse.json(
      { message: "Erro ao processar o ficheiro.", error: error.message },
      { status: 500 }
    );
  }
}
