// app/api/s3/get-signed-url/route.ts

import { s3Client } from "@/lib/aws";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const bucketType = searchParams.get("bucketType"); // Novo parâmetro

    if (!key) {
      return NextResponse.json(
        { message: "O parâmetro 'key' é obrigatório." },
        { status: 400 }
      );
    }
    const bucketName =
      bucketType === "user-files"
        ? process.env.AWS_S3_BUCKET_NAME! // Bucket para avatares e relatórios
        : process.env.JRPOINTS_S3_BUCKET_NAME!; // Bucket padrão para o JR Points

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60 * 5, // 5 minutos
    });

    return new Response(JSON.stringify({ url: signedUrl }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Erro ao gerar signed URL:", err);
    return new Response(JSON.stringify({ error: "Erro ao gerar signed URL" }), {
      status: 500,
    });
  }
}
