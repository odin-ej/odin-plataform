import prisma from "@/db";
import { generateEmbedding, embeddingToSql } from "../embeddings";
import { KrakenKnowledgeResult } from "../types";

/**
 * Search the knowledge base for relevant chunks.
 * Uses pgvector cosine similarity.
 */
export async function searchKnowledge(
  query: string,
  agentId: string,
  options: {
    topK?: number;
    threshold?: number;
  } = {}
): Promise<KrakenKnowledgeResult[]> {
  const { topK = 5, threshold = 0.7 } = options;

  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = embeddingToSql(queryEmbedding);

  const results = await prisma.$queryRawUnsafe<
    Array<{
      content: string;
      sourceName: string;
      sourceUrl: string | null;
      metadata: Record<string, unknown>;
      similarity: number;
    }>
  >(
    `SELECT content, "sourceName", "sourceUrl", metadata,
            1 - ("contentEmbedding" <=> $1::vector) AS similarity
     FROM "KrakenKnowledgeChunk"
     WHERE $2 = ANY("agentScope")
       AND "isActive" = true
       AND "contentEmbedding" IS NOT NULL
       AND 1 - ("contentEmbedding" <=> $1::vector) > $3
     ORDER BY "contentEmbedding" <=> $1::vector
     LIMIT $4`,
    embeddingStr,
    agentId,
    threshold,
    topK
  );

  return results.map((r) => ({
    content: r.content,
    sourceName: r.sourceName,
    sourceUrl: r.sourceUrl,
    similarity: r.similarity,
    metadata: r.metadata,
  }));
}

/**
 * Format RAG results into context string for injection into agent prompt.
 */
export function formatRagContext(results: KrakenKnowledgeResult[]): string {
  if (results.length === 0) {
    return "Nenhum documento relevante encontrado na base de conhecimento.";
  }

  return results
    .map(
      (r, i) =>
        `[Documento ${i + 1}: ${r.sourceName}]\n${r.content}\n---`
    )
    .join("\n\n");
}
