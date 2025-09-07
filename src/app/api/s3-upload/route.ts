import { NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as crypto from "crypto";
import { s3Client } from "@/lib/aws";

// Função para gerar um nome de arquivo aleatório e seguro
const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

export async function POST(request: Request) {
  try {
    const { fileType, fileSize, olderFile } = await request.json();

    // Validações de segurança
    if (!fileType || !fileSize) {
      return NextResponse.json(
        { message: "Tipo ou tamanho do arquivo em falta." },
        { status: 400 }
      );
    }
    if (fileSize > 1024 * 1024 * 5) {
      // Limite de 5MB
      return NextResponse.json(
        { message: "O arquivo é demasiado grande (máx 5MB)." },
        { status: 400 }
      );
    }

    if (olderFile) {
      //Preciso deletar o arquivo
      //olderFile é o imageUrl dele
      const url = new URL(olderFile);
      const key = decodeURIComponent(url.pathname.slice(1)); // Remove a "/" do início

      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
      });
      await s3Client.send(deleteCommand);
    }

    const fileName = generateFileName();
    const fileExtension = fileType.split("/")[1];
    const key = `${fileName}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      ContentType: fileType,
      ContentLength: fileSize,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 600,
    }); // URL válido por 10 minutos

    // --- DIFERENÇA NA LAMBDA ---
    // Numa função Lambda, o código seria quase idêntico. A principal diferença
    // seria a forma como você acede às credenciais da AWS. Em vez de usar
    // process.env, você daria à "Execution Role" da sua Lambda permissão para
    // aceder ao S3, e o SDK da AWS usaria essas permissões automaticamente, sem
    // precisar de accessKeyId e secretAccessKey no código.
    return NextResponse.json({ url: presignedUrl, key: key });
  } catch (error) {
    console.error("Erro ao gerar URL pré-assinado:", error);
    return NextResponse.json(
      { message: "Falha ao gerar URL para upload." },
      { status: 500 }
    );
  }
}
