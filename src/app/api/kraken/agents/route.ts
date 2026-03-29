import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextResponse } from "next/server";
import { s3Client } from "@/lib/aws";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Resolve an S3 key to a signed URL. Verifies key exists first. */
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

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const agents = await prisma.krakenAgent.findMany({
      orderBy: { displayName: "asc" },
      include: {
        _count: {
          select: {
            conversations: true,
            usageLogs: true,
          },
        },
      },
    });

    // Resolve S3 keys → signed URLs in parallel
    const agentsWithUrls = await Promise.all(
      agents.map(async (agent) => ({
        ...agent,
        iconUrl: await resolveIconUrl(agent.iconUrl),
      }))
    );

    return NextResponse.json(agentsWithUrls);
  } catch (error) {
    console.error("[Kraken Agents] GET error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();

    const agent = await prisma.krakenAgent.create({
      data: {
        id: body.id,
        displayName: body.displayName,
        category: body.category,
        description: body.description,
        model: body.model,
        maxTokens: body.maxTokens ?? 1024,
        systemPrompt: body.systemPrompt,
        isActive: body.isActive ?? true,
        iconUrl: body.iconUrl ?? null,
        color: body.color ?? null,
        requiresRag: body.requiresRag ?? false,
        ragScope: body.ragScope ?? [],
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("[Kraken Agents] POST error:", error);
    return NextResponse.json({ error: "Erro ao criar agente" }, { status: 500 });
  }
}
