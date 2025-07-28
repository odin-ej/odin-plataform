import { NextResponse } from "next/server";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/aws";

const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

export async function POST(request: Request) {
  try {
    const { fileType, fileSize } = await request.json();

    // Validações de segurança
    if (!fileType || !fileSize) {
      return NextResponse.json(
        { message: "Tipo ou tamanho do ficheiro em falta." },
        { status: 400 }
      );
    }
    // Pode definir um limite de tamanho diferente para os ficheiros do chat
    if (fileSize > 1024 * 1024 * 10) {
      // Limite de 10MB
      return NextResponse.json(
        { message: "O ficheiro é demasiado grande (máx 10MB)." },
        { status: 400 }
      );
    }

    const fileName = generateFileName();
    const fileExtension = fileType.split("/")[1];
    const key = `${fileName}.${fileExtension}`;

    const command = new PutObjectCommand({
      // CORREÇÃO: Usa a nova variável de ambiente para o bucket do chat.
      Bucket: process.env.AWS_S3_CHAT_BUCKET_NAME!,
      Key: key,
      ContentType: fileType,
      ContentLength: fileSize,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 600,
    }); // URL válido por 10 minutos

    return NextResponse.json({ url: presignedUrl, key: key });
  } catch (error) {
    console.error("Erro ao gerar URL pré-assinado para o chat:", error);
    return NextResponse.json(
      { message: "Falha ao gerar URL para upload." },
      { status: 500 }
    );
  }
}
