import { prisma } from "@/db";
import { listFolderFiles, extractFileContent, DriveFile } from "./google-drive-client";
import { chunkText } from "../rag/chunker";
import { generateEmbeddings, embeddingToSql } from "../embeddings";

export interface DriveFolderConfig {
  folderId: string;
  folderName: string;
  agentScope: string[];
  lastSyncAt?: string;
}

export interface SyncResult {
  folderId: string;
  filesProcessed: number;
  filesSkipped: number;
  chunksCreated: number;
  errors: string[];
}

/**
 * Sync a Google Drive folder into the Kraken knowledge base.
 *
 * - Lists all files in the folder
 * - Skips files not modified since last sync (tracked via metadata.driveFileId + modifiedTime)
 * - Extracts text content, chunks it, generates embeddings
 * - Saves to KrakenKnowledgeChunk with sourceType = 'google_drive'
 */
export async function syncDriveFolder(
  config: DriveFolderConfig
): Promise<SyncResult> {
  const result: SyncResult = {
    folderId: config.folderId,
    filesProcessed: 0,
    filesSkipped: 0,
    chunksCreated: 0,
    errors: [],
  };

  let files: DriveFile[];
  try {
    files = await listFolderFiles(config.folderId);
  } catch (error) {
    result.errors.push(`Falha ao listar arquivos: ${String(error)}`);
    return result;
  }

  // Get existing synced files for this folder to check modification times
  const existingChunks = await prisma.$queryRaw<
    Array<{ metadata: Record<string, unknown>; sourceName: string }>
  >`
    SELECT DISTINCT "sourceName", "metadata"
    FROM "KrakenKnowledgeChunk"
    WHERE "sourceType" = 'google_drive'
      AND "metadata"->>'driveFolderId' = ${config.folderId}
      AND "isActive" = true
  `;

  // Build a map of fileId → last synced modifiedTime
  const syncedFiles = new Map<string, string>();
  for (const chunk of existingChunks) {
    const fileId = chunk.metadata?.driveFileId as string | undefined;
    const modTime = chunk.metadata?.driveModifiedTime as string | undefined;
    if (fileId && modTime) {
      syncedFiles.set(fileId, modTime);
    }
  }

  console.log(`[Drive Sync] ${files.length} files found in folder ${config.folderName}`);

  for (const file of files) {
    // Skip files that haven't changed since last sync
    const lastSyncedModTime = syncedFiles.get(file.id);
    if (lastSyncedModTime && lastSyncedModTime === file.modifiedTime) {
      result.filesSkipped++;
      continue;
    }

    // Extract text content
    let content: string | null = null;
    try {
      content = await extractFileContent(file.id, file.mimeType);
    } catch (err) {
      console.log(`[Drive Sync] EXTRACT FAILED: ${file.name} (${file.mimeType}): ${String(err).slice(0, 100)}`);
      result.errors.push(`Extração falhou: ${file.name}`);
      continue;
    }
    if (!content || content.trim().length < 20) {
      console.log(`[Drive Sync] SKIPPED (empty/short): ${file.name} (${file.mimeType}) - ${content?.length ?? 0} chars`);
      result.filesSkipped++;
      continue;
    }
    // Only clean HTML if the content actually looks like HTML
    const looksLikeHtml = content.slice(0, 500).includes("<html") || content.slice(0, 500).includes("<!DOCTYPE");
    if (looksLikeHtml) {
      content = content
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s{3,}/g, "\n")
        .trim();
    }

    // Collapse excessive whitespace for non-HTML content too
    content = content.replace(/\s{5,}/g, "\n").trim();

    // No truncation — process all content (embedding cost is negligible)
    console.log(`[Drive Sync] PROCESSING: ${file.name} (${content.length} chars)`);

    // Chunk the content
    const chunks = chunkText(content, { chunkSize: 500, overlap: 100 });
    if (chunks.length === 0) {
      result.filesSkipped++;
      continue;
    }

    // Process all chunks (embedding cost is negligible: ~$0.02 per 1M tokens)
    const chunksToProcess = chunks;

    // Generate embeddings in batches of 20 to avoid rate limits
    const embeddings: number[][] = [];
    const BATCH_SIZE = 20;
    try {
      for (let b = 0; b < chunksToProcess.length; b += BATCH_SIZE) {
        const batch = chunksToProcess.slice(b, b + BATCH_SIZE);
        const batchEmbeddings = await generateEmbeddings(batch.map((c) => c.text));
        embeddings.push(...batchEmbeddings);
      }
    } catch (error) {
      result.errors.push(`Embedding falhou para ${file.name}: ${String(error)}`);
      continue;
    }

    // Delete old chunks for this specific file (re-sync)
    await prisma.$executeRaw`
      DELETE FROM "KrakenKnowledgeChunk"
      WHERE "sourceType" = 'google_drive'
        AND "metadata"->>'driveFileId' = ${file.id}
    `;

    // Insert new chunks
    const sourceName = `[Drive] ${file.name}`;
    for (let i = 0; i < chunksToProcess.length; i++) {
      const embeddingStr = embeddingToSql(embeddings[i]);
      const metadata = JSON.stringify({
        driveFolderId: config.folderId,
        driveFolderName: config.folderName,
        driveFileId: file.id,
        driveFileName: file.name,
        driveModifiedTime: file.modifiedTime,
        driveMimeType: file.mimeType,
      });

      await prisma.$executeRawUnsafe(
        `INSERT INTO "KrakenKnowledgeChunk"
         ("id", "sourceType", "sourceName", "sourceUrl", "chunkIndex", "content",
          "contentEmbedding", "metadata", "agentScope", "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'google_drive', $1, $2, $3, $4, $5::vector, $6::jsonb, $7::text[], true, NOW(), NOW())`,
        sourceName,
        `https://drive.google.com/file/d/${file.id}`,
        i,
        chunksToProcess[i].text,
        embeddingStr,
        metadata,
        config.agentScope
      );
    }

    result.filesProcessed++;
    result.chunksCreated += chunks.length;
  }

  return result;
}

/**
 * Remove all knowledge chunks associated with a Drive folder.
 */
export async function removeDriveFolderChunks(folderId: string): Promise<number> {
  const deleted = await prisma.$executeRaw`
    DELETE FROM "KrakenKnowledgeChunk"
    WHERE "sourceType" = 'google_drive'
      AND "metadata"->>'driveFolderId' = ${folderId}
  `;
  return deleted;
}

/**
 * Get stats about a synced Drive folder.
 */
export async function getDriveFolderStats(folderId: string) {
  const stats = await prisma.$queryRaw<
    Array<{ fileCount: number; chunkCount: number }>
  >`
    SELECT
      COUNT(DISTINCT "metadata"->>'driveFileId')::int as "fileCount",
      COUNT(*)::int as "chunkCount"
    FROM "KrakenKnowledgeChunk"
    WHERE "sourceType" = 'google_drive'
      AND "metadata"->>'driveFolderId' = ${folderId}
      AND "isActive" = true
  `;

  return stats[0] ?? { fileCount: 0, chunkCount: 0 };
}
