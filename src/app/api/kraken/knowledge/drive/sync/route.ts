import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextResponse } from "next/server";
import { syncDriveFolder } from "@/lib/kraken/drive/drive-sync";

const CONFIG_SOURCE_TYPE = "drive_connection";

/**
 * POST /api/kraken/knowledge/drive/sync
 * Triggers a re-sync of a specific connected folder.
 * Body: { folderId }
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN_KNOWLEDGE))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { folderId } = body as { folderId: string };

    if (!folderId) {
      return NextResponse.json(
        { error: "Campo obrigatório: folderId" },
        { status: 400 }
      );
    }

    // Look up the connection config
    const configRow = await prisma.krakenKnowledgeChunk.findFirst({
      where: {
        sourceType: CONFIG_SOURCE_TYPE,
        isActive: true,
        metadata: { path: ["folderId"], equals: folderId },
      },
    });

    if (!configRow) {
      return NextResponse.json(
        { error: "Pasta não encontrada nas conexões" },
        { status: 404 }
      );
    }

    const meta = configRow.metadata as Record<string, unknown>;
    const folderName = (meta.folderName as string) || configRow.sourceName;

    // Execute sync
    const result = await syncDriveFolder({
      folderId,
      folderName,
      agentScope: configRow.agentScope,
    });

    // Update lastSyncAt in the config row
    await prisma.krakenKnowledgeChunk.updateMany({
      where: {
        sourceType: CONFIG_SOURCE_TYPE,
        metadata: { path: ["folderId"], equals: folderId },
      },
      data: {
        metadata: {
          ...meta,
          lastSyncAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Kraken Drive Sync] error:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar pasta" },
      { status: 500 }
    );
  }
}
