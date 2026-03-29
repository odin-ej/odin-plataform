import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextResponse } from "next/server";
import { ingestDocument, deleteSourceChunks } from "@/lib/kraken/rag/ingestor";

/**
 * POST /api/kraken/knowledge/ingest — Ingest a document into the knowledge base.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN_KNOWLEDGE))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { content, sourceName, sourceType, sourceUrl, agentScope, metadata } = body;

    if (!content || !sourceName || !sourceType || !agentScope) {
      return NextResponse.json(
        { error: "Campos obrigatórios: content, sourceName, sourceType, agentScope" },
        { status: 400 }
      );
    }

    const result = await ingestDocument({
      content,
      sourceName,
      sourceType,
      sourceUrl,
      agentScope,
      metadata,
    });

    return NextResponse.json({
      success: true,
      chunksCreated: result.chunksCreated,
      sourceName: result.sourceName,
    });
  } catch (error) {
    console.error("[Kraken Knowledge Ingest] error:", error);
    return NextResponse.json({ error: "Erro ao ingerir documento" }, { status: 500 });
  }
}

/**
 * GET /api/kraken/knowledge/ingest — List knowledge sources.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN_KNOWLEDGE))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    // Group by source to show summary
    const sources = await prisma.$queryRaw<
      Array<{
        sourceType: string;
        sourceName: string;
        sourceUrl: string | null;
        chunkCount: number;
        agentScope: string[];
        createdAt: Date;
      }>
    >`
      SELECT "sourceType", "sourceName", "sourceUrl",
             COUNT(*)::int as "chunkCount",
             MAX("agentScope") as "agentScope",
             MIN("createdAt") as "createdAt"
      FROM "KrakenKnowledgeChunk"
      WHERE "isActive" = true
      GROUP BY "sourceType", "sourceName", "sourceUrl"
      ORDER BY MIN("createdAt") DESC
    `;

    return NextResponse.json(sources);
  } catch (error) {
    console.error("[Kraken Knowledge] GET error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * DELETE /api/kraken/knowledge/ingest — Delete a knowledge source.
 */
export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN_KNOWLEDGE))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { sourceName, sourceType } = body;

    if (!sourceName || !sourceType) {
      return NextResponse.json(
        { error: "Campos obrigatórios: sourceName, sourceType" },
        { status: 400 }
      );
    }

    const result = await deleteSourceChunks(sourceName, sourceType);

    return NextResponse.json({
      success: true,
      chunksDeleted: result.count,
    });
  } catch (error) {
    console.error("[Kraken Knowledge Delete] error:", error);
    return NextResponse.json({ error: "Erro ao deletar fonte" }, { status: 500 });
  }
}
