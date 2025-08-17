import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { s3Client } from "@/lib/aws";

// --- Configuração ---
// Define o limite máximo de tamanho do arquivo em MB
const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = 1024 * 1024 * MAX_FILE_SIZE_MB;

// --- Schema de Validação Atualizado ---
// Agora esperamos também o tamanho do arquivo e, opcionalmente, a URL de um arquivo antigo.
const uploadSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number().positive(),
  subfolder: z
    .enum(["solicitations", "reports"])
    .optional()
    .default("solicitations"),
  olderFileUrl: z.string().url().optional().nullable(),
});

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const { fileName, fileType, fileSize, subfolder, olderFileUrl } =
      uploadSchema.parse(body);
    // --- 1. Validação de Tamanho do Arquivo ---
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { message: `O arquivo é muito grande (máx ${MAX_FILE_SIZE_MB}MB).` },
        { status: 413 } // 413 Payload Too Large é mais apropriado
      );
    }

    // --- 2. Exclusão de Arquivo Antigo (se aplicável) ---
    if (olderFileUrl) {
      try {
        const url = new URL(olderFileUrl);
        // Extrai a chave do S3 (tudo após o nome do bucket no path)
        const key = decodeURIComponent(url.pathname.substring(1));

        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.JRPOINTS_S3_BUCKET_NAME!,
          Key: key,
        });
        await s3Client.send(deleteCommand);

      } catch (deleteError) {
        console.error(
          "Falha ao deletar arquivo antigo. Prosseguindo com o upload...",
          deleteError
        );
        // Geralmente não retornamos um erro aqui, para não impedir o novo upload.
      }
    }

    // --- 3. Geração da URL Pré-Assinada para o Novo Arquivo ---
    const uniqueFileName = `${uuidv4()}-${fileName.replace(/\s/g, "_")}`;
    const s3Key = `${subfolder}/${authUser.id}/${uniqueFileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.JRPOINTS_S3_BUCKET_NAME!,
      Key: s3Key,
      ContentType: fileType,
      // Segurança Adicional: Restringe o upload ao tamanho exato do arquivo.
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    return NextResponse.json({
      uploadUrl,
      fileName,
      fileType,
      s3Key,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Dados de upload inválidos.", errors: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Erro ao gerar URL de upload para JR Points:", error);
    return NextResponse.json(
      { message: "Falha ao processar upload." },
      { status: 500 }
    );
  }
}
