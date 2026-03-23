// app/api/community/upload-file/route.ts
import { s3Client } from "@/lib/aws";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import * as crypto from "crypto";

// Função para gerar um nome de arquivo aleatório e seguro
const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[]; // Alterado para 'files' para receber múltiplos

    if (!files || files.length === 0) {
      return new NextResponse("Nenhum arquivo fornecido.", { status: 400 });
    }

    const uploadedFilesData = await Promise.all(
      files.map(async (file) => {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileExtension = file.name.split(".").pop();
        const key = `community-uploads/${
          authUser.id
        }/${generateFileName()}.${fileExtension}`;

        const command = new PutObjectCommand({
          Bucket: process.env.COMMUNITY_S3_BUCKET_NAME!,
          Key: key,
          Body: fileBuffer,
          ContentType: file.type,
        });

        await s3Client.send(command);

        return {
          key, // A chave S3 que será salva no banco
          fileName: file.name,
          fileType: file.type,
        };
      })
    );

    return NextResponse.json({ files: uploadedFilesData }, { status: 200 });
  } catch (error) {
    console.error("Erro no upload de arquivo para a comunidade:", error);
    return new NextResponse("Erro interno ao fazer upload do arquivo.", {
      status: 500,
    });
  }
}
