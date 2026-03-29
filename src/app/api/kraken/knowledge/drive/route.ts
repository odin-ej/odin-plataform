import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextResponse } from "next/server";
import { validateFolderAccess, getServiceAccountEmail } from "@/lib/kraken/drive/google-drive-client";
import { syncDriveFolder, removeDriveFolderChunks, getDriveFolderStats } from "@/lib/kraken/drive/drive-sync";

// We store connected folder configs as special rows in KrakenKnowledgeChunk
// with sourceType = 'drive_connection'. This avoids schema migrations.
const CONFIG_SOURCE_TYPE = "drive_connection";

interface DriveConnection {
  folderId: string;
  folderName: string;
  agentScope: string[];
  connectedAt: string;
  lastSyncAt: string | null;
  fileCount: number;
  chunkCount: number;
}

/**
 * GET /api/kraken/knowledge/drive
 * Lists connected Drive folders + service account email.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN_KNOWLEDGE))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    // Fetch connection config rows
    const configRows = await prisma.krakenKnowledgeChunk.findMany({
      where: { sourceType: CONFIG_SOURCE_TYPE, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    const connections: DriveConnection[] = [];

    for (const row of configRows) {
      const meta = row.metadata as Record<string, unknown>;
      const folderId = meta.folderId as string;
      const stats = await getDriveFolderStats(folderId);

      connections.push({
        folderId,
        folderName: row.sourceName,
        agentScope: row.agentScope,
        connectedAt: row.createdAt.toISOString(),
        lastSyncAt: (meta.lastSyncAt as string) ?? null,
        fileCount: stats.fileCount,
        chunkCount: stats.chunkCount,
      });
    }

    return NextResponse.json({
      connections,
      serviceAccountEmail: getServiceAccountEmail(),
    });
  } catch (error) {
    console.error("[Kraken Drive] GET error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * POST /api/kraken/knowledge/drive
 * Connect a new Drive folder.
 * Body: { folderId, folderName?, agentScope: string[] }
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN_KNOWLEDGE))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { folderId, folderName, agentScope } = body as {
      folderId: string;
      folderName?: string;
      agentScope: string[];
    };

    if (!folderId || !agentScope || agentScope.length === 0) {
      return NextResponse.json(
        { error: "Campos obrigatórios: folderId, agentScope" },
        { status: 400 }
      );
    }

    // Extract folder ID from URL if user pasted a full Drive link
    const cleanFolderId = extractFolderId(folderId);

    // Check if already connected
    const existing = await prisma.krakenKnowledgeChunk.findFirst({
      where: {
        sourceType: CONFIG_SOURCE_TYPE,
        isActive: true,
        metadata: { path: ["folderId"], equals: cleanFolderId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Esta pasta já está conectada" },
        { status: 409 }
      );
    }

    // Validate folder access
    const validation = await validateFolderAccess(cleanFolderId);
    if (!validation.accessible) {
      return NextResponse.json(
        {
          error:
            "Não foi possível acessar esta pasta. Verifique se o ID está correto e se a pasta foi compartilhada com a conta de serviço.",
        },
        { status: 400 }
      );
    }

    const resolvedName = folderName || validation.folderName || cleanFolderId;

    // Save connection config as a special KrakenKnowledgeChunk row
    await prisma.krakenKnowledgeChunk.create({
      data: {
        sourceType: CONFIG_SOURCE_TYPE,
        sourceName: resolvedName,
        sourceUrl: `https://drive.google.com/drive/folders/${cleanFolderId}`,
        chunkIndex: 0,
        content: `Drive folder connection: ${resolvedName}`,
        metadata: {
          folderId: cleanFolderId,
          folderName: resolvedName,
          connectedBy: user.id,
          lastSyncAt: null,
        },
        agentScope,
        isActive: true,
      },
    });

    // Trigger initial sync (async, don't block the response)
    syncDriveFolder({
      folderId: cleanFolderId,
      folderName: resolvedName,
      agentScope,
    })
      .then(async (syncResult) => {
        // Update lastSyncAt in the config row
        await prisma.krakenKnowledgeChunk.updateMany({
          where: {
            sourceType: CONFIG_SOURCE_TYPE,
            metadata: { path: ["folderId"], equals: cleanFolderId },
          },
          data: {
            metadata: {
              folderId: cleanFolderId,
              folderName: resolvedName,
              connectedBy: user.id,
              lastSyncAt: new Date().toISOString(),
            },
          },
        });
        console.log(
          `[Kraken Drive] Initial sync complete for ${resolvedName}:`,
          syncResult
        );
      })
      .catch((err) => {
        console.error(`[Kraken Drive] Initial sync failed for ${resolvedName}:`, err);
      });

    return NextResponse.json({
      success: true,
      folderId: cleanFolderId,
      folderName: resolvedName,
      message: "Pasta conectada. Sincronização inicial em andamento.",
    });
  } catch (error) {
    console.error("[Kraken Drive] POST error:", error);
    return NextResponse.json({ error: "Erro ao conectar pasta" }, { status: 500 });
  }
}

/**
 * DELETE /api/kraken/knowledge/drive
 * Disconnect a folder and remove its knowledge chunks.
 * Body: { folderId }
 */
export async function DELETE(request: Request) {
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

    // Remove the connection config row
    await prisma.krakenKnowledgeChunk.deleteMany({
      where: {
        sourceType: CONFIG_SOURCE_TYPE,
        metadata: { path: ["folderId"], equals: folderId },
      },
    });

    // Remove all knowledge chunks from this folder
    const deletedChunks = await removeDriveFolderChunks(folderId);

    return NextResponse.json({
      success: true,
      chunksDeleted: deletedChunks,
    });
  } catch (error) {
    console.error("[Kraken Drive] DELETE error:", error);
    return NextResponse.json({ error: "Erro ao desconectar pasta" }, { status: 500 });
  }
}

/**
 * Extract folder ID from a Google Drive URL or return the raw ID.
 * Handles:
 *   https://drive.google.com/drive/folders/FOLDER_ID?...
 *   https://drive.google.com/drive/u/0/folders/FOLDER_ID
 *   FOLDER_ID (raw)
 */
function extractFolderId(input: string): string {
  const trimmed = input.trim();

  // Try to parse as URL
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // Already a raw ID
  return trimmed;
}
