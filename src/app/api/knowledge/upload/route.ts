import { prisma } from "@/db";
import { s3Client } from "@/lib/aws";
import { embeddingModel } from "@/lib/gemini";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import { Readable } from "stream";

export const runtime = "nodejs";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();

    const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

    if (!authUser || !hasPermission) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { s3Key, fileName } = await request.json();
    if (!s3Key || !fileName) {
      return NextResponse.json(
        { message: "Chave S3 ou nome do arquivo em falta." },
        { status: 400 }
      );
    }
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_CHAT_BUCKET_NAME!,
      Key: s3Key,
    });
    const s3Response = await s3Client.send(command);

    if (!s3Response.Body) {
      return NextResponse.json(
        { message: "Arquivo em falta." },
        { status: 400 }
      );
    }

    const fileBuffer = await streamToBuffer(s3Response.Body as Readable);
    const fileType = s3Response.ContentType;

    let textContent = "";

    if (fileType === "application/pdf") {
      const data = await pdf(fileBuffer);
      textContent = data.text;
    } else {
      textContent = fileBuffer.toString("utf-8");
    }

    if (!textContent.trim()) {
      return NextResponse.json(
        { message: "O arquivo está vazio ou ilegível." },
        { status: 400 }
      );
    }

    // Divide o texto em pedaços (chunks)
    const chunks = textContent.match(/.{1,1500}/gs) || [];
    if (chunks.length === 0) {
      return NextResponse.json(
        { message: "Não foi possível extrair conteúdo do arquivo." },
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
      message: `✅ Arquivo processado com sucesso! ${chunks.length} pedaços foram adicionados.`,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("❌ Erro ao processar arquivo de conhecimento:", error);
    return NextResponse.json(
      { message: "Erro ao processar o arquivo.", error: error.message },
      { status: 500 }
    );
  }
}
