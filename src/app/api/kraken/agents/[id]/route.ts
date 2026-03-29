import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextResponse } from "next/server";
import { s3Client } from "@/lib/aws";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

async function resolveIconUrl(key: string | null): Promise<string | null> {
  if (!key || key.trim() === "") return null;
  if (key.includes("X-Amz-Signature")) return key;
  if (key.startsWith("http://") || key.startsWith("https://")) {
    try { key = decodeURIComponent(new URL(key).pathname.slice(1)); } catch { return null; }
  }
  const bucket = process.env.AWS_S3_CHAT_BUCKET_NAME!;
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const agent = await prisma.krakenAgent.findUnique({ where: { id } });

    if (!agent) {
      return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ...agent,
      iconUrl: await resolveIconUrl(agent.iconUrl),
    });
  } catch (error) {
    console.error("[Kraken Agent] GET error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const agent = await prisma.krakenAgent.update({
      where: { id },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.model !== undefined && { model: body.model }),
        ...(body.maxTokens !== undefined && { maxTokens: body.maxTokens }),
        ...(body.systemPrompt !== undefined && { systemPrompt: body.systemPrompt }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.iconUrl !== undefined && { iconUrl: body.iconUrl }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.requiresRag !== undefined && { requiresRag: body.requiresRag }),
        ...(body.ragScope !== undefined && {
          ragScope: Array.isArray(body.ragScope)
            ? body.ragScope
            : typeof body.ragScope === "string"
              ? body.ragScope.split(",").map((s: string) => s.trim()).filter(Boolean)
              : [],
        }),
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error("[Kraken Agent] PATCH error:", error);
    return NextResponse.json({ error: "Erro ao atualizar agente" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;

    // Soft delete — set inactive instead of deleting
    await prisma.krakenAgent.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Kraken Agent] DELETE error:", error);
    return NextResponse.json({ error: "Erro ao desativar agente" }, { status: 500 });
  }
}
