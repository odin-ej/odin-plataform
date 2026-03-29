import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { s3Client } from "@/lib/aws";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Resolve an S3 key to a signed URL. Returns null on failure. */
async function resolveIconUrl(key: string | null | undefined): Promise<string | null> {
  if (!key || key.trim() === "") return null;
  if (key.startsWith("http://") || key.startsWith("https://")) {
    try { key = decodeURIComponent(new URL(key).pathname.slice(1)); } catch { return null; }
  }
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_CHAT_BUCKET_NAME!,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 300 });
  } catch {
    return null;
  }
}

/** Resolve iconUrl for an agent object in-place */
async function resolveAgentIcon<T extends { iconUrl?: string | null }>(
  agent: T | null
): Promise<T | null> {
  if (!agent) return agent;
  return { ...agent, iconUrl: await resolveIconUrl(agent.iconUrl) };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;

    const conversation = await prisma.krakenConversation.findFirst({
      where: { id, userId: authUser.id, isActive: true },
      include: {
        agent: {
          select: { id: true, displayName: true, color: true, iconUrl: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            agent: {
              select: { id: true, displayName: true, color: true, iconUrl: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversa não encontrada." },
        { status: 404 }
      );
    }

    // Resolve S3 icon URLs for conversation agent and all message agents
    const iconUrlCache = new Map<string, string | null>();
    async function getCachedIconUrl(key: string | null | undefined): Promise<string | null> {
      if (!key) return null;
      if (iconUrlCache.has(key)) return iconUrlCache.get(key)!;
      const resolved = await resolveIconUrl(key);
      iconUrlCache.set(key, resolved);
      return resolved;
    }

    const resolvedConvAgent = conversation.agent
      ? { ...conversation.agent, iconUrl: await getCachedIconUrl(conversation.agent.iconUrl) }
      : null;

    const resolvedMessages = await Promise.all(
      conversation.messages.map(async (msg) => ({
        ...msg,
        agent: msg.agent
          ? { ...msg.agent, iconUrl: await getCachedIconUrl(msg.agent.iconUrl) }
          : null,
      }))
    );

    return NextResponse.json({
      ...conversation,
      agent: resolvedConvAgent,
      messages: resolvedMessages,
    });
  } catch (error) {
    console.error("Erro ao buscar conversa do Kraken:", error);
    return NextResponse.json(
      { message: "Erro ao buscar conversa." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;

    const conversation = await prisma.krakenConversation.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversa não encontrada." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData: { title?: string; isActive?: boolean } = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updated = await prisma.krakenConversation.update({
      where: { id },
      data: updateData,
      include: {
        agent: {
          select: { id: true, displayName: true, color: true, iconUrl: true },
        },
      },
    });

    return NextResponse.json({
      ...updated,
      agent: await resolveAgentIcon(updated.agent),
    });
  } catch (error) {
    console.error("Erro ao atualizar conversa do Kraken:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar conversa." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;

    const conversation = await prisma.krakenConversation.findFirst({
      where: { id, userId: authUser.id, isActive: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversa não encontrada ou já removida." },
        { status: 404 }
      );
    }

    await prisma.krakenConversation.update({
      where: { id },
      data: { isActive: false },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao remover conversa do Kraken:", error);
    return NextResponse.json(
      { message: "Erro ao remover conversa." },
      { status: 500 }
    );
  }
}
