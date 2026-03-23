import { getAuthenticatedUser } from "@/lib/server-utils";
import { s3Client } from "@/lib/aws";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";

const urlSchema = z.object({
  key: z.string().min(1, "A chave do arquivo é obrigatória."),
});

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = urlSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: "Chave do arquivo inválida." }, { status: 400 });
    }
    
    const { key } = validation.data;

    // Crie um comando para obter o objeto
    const command = new GetObjectCommand({
      Bucket: process.env.ORACULO_S3_BUCKET_NAME!,
      Key: key,
    });

    // Gere a URL assinada com validade de 1 hora (3600 segundos)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ url: signedUrl });

  } catch (error) {
    console.error("Erro ao gerar a URL assinada:", error);
    return NextResponse.json({ message: "Não foi possível obter o acesso ao arquivo." }, { status: 500 });
  }
}