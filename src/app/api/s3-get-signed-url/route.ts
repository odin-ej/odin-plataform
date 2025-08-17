// app/api/s3/get-signed-url/route.ts

import { s3Client } from "@/lib/aws";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { message: "Está faltando o key no parametro" },
      { status: 400 }
    );
  }

  const authUser = await getAuthenticatedUser()

  if(!authUser) return NextResponse.json({message:  'Não autorizado'}, {status: 401})

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.JRPOINTS_S3_BUCKET_NAME!,
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
