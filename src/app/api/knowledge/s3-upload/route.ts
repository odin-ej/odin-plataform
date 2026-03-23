// /api/knowledge/s3-upload/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/aws";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";

const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { fileType, fileSize } = await request.json();

    if (!fileType || !fileSize) {
      return NextResponse.json(
        { message: "Tipo ou tamanho do arquivo em falta." },
        { status: 400 }
      );
    }

    // ✅ Permite uploads de até 200MB
    if (fileSize > 1024 * 1024 * 200) {
      return NextResponse.json(
        { message: "O arquivo é demasiado grande (máx 200MB)." },
        { status: 413 }
      );
    }

    const fileName = generateFileName();
    const fileExtension = fileType.split("/")[1];
    const key = `${fileName}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_CHAT_BUCKET_NAME!, // Use um bucket específico para conhecimento
      Key: key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 600,
    });

    return NextResponse.json({ url: presignedUrl, key: key });
  } catch (error) {
    console.error("Erro ao gerar URL pré-assinado para conhecimento:", error);
    return NextResponse.json(
      { message: "Falha ao gerar URL para upload." },
      { status: 500 }
    );
  }
}
