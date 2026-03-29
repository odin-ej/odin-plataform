import { prisma } from "@/db";
import { generateEmbeddings, embeddingToSql } from "../embeddings";
import { chunkText } from "./chunker";

interface IngestOptions {
  content: string;
  sourceName: string;
  sourceType: string;
  sourceUrl?: string;
  agentScope: string[];
  metadata?: Record<string, unknown>;
}

interface IngestResult {
  chunksCreated: number;
  sourceName: string;
}

/**
 * Ingest a document into the Kraken knowledge base.
 * Splits into chunks, generates embeddings, and stores in DB.
 */
export async function ingestDocument(
  options: IngestOptions
): Promise<IngestResult> {
  const chunks = chunkText(options.content, {
    chunkSize: 500,
    overlap: 100,
  });

  if (chunks.length === 0) {
    return { chunksCreated: 0, sourceName: options.sourceName };
  }

  // Generate embeddings in batch
  const embeddings = await generateEmbeddings(chunks.map((c) => c.text));

  // Delete existing chunks for this source (re-ingestion)
  await prisma.krakenKnowledgeChunk.deleteMany({
    where: { sourceName: options.sourceName, sourceType: options.sourceType },
  });

  // Insert chunks with embeddings using raw SQL (for vector type)
  for (let i = 0; i < chunks.length; i++) {
    const embeddingStr = embeddingToSql(embeddings[i]);
    const metadata = {
      ...options.metadata,
      section: chunks[i].metadata.section,
    };

    await prisma.$executeRawUnsafe(
      `INSERT INTO "KrakenKnowledgeChunk"
       ("id", "sourceType", "sourceName", "sourceUrl", "chunkIndex", "content",
        "contentEmbedding", "metadata", "agentScope", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::vector, $7::jsonb, $8::text[], true, NOW(), NOW())`,
      options.sourceType,
      options.sourceName,
      options.sourceUrl ?? null,
      i,
      chunks[i].text,
      embeddingStr,
      JSON.stringify(metadata),
      options.agentScope
    );
  }

  return {
    chunksCreated: chunks.length,
    sourceName: options.sourceName,
  };
}

/**
 * Delete all chunks for a given source.
 */
export async function deleteSourceChunks(
  sourceName: string,
  sourceType: string
) {
  return prisma.krakenKnowledgeChunk.deleteMany({
    where: { sourceName, sourceType },
  });
}
