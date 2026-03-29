import { prisma } from "@/db";
import { generateEmbedding, embeddingToSql } from "../embeddings";
import { KrakenCacheHit } from "../types";

/**
 * Find a cached response using semantic similarity.
 * Returns null if no match above threshold.
 */
export async function findCachedResponse(
  query: string,
  threshold = 0.92
): Promise<KrakenCacheHit | null> {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = embeddingToSql(queryEmbedding);

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      response: string;
      agentId: string | null;
      similarity: number;
    }>
  >(
    `SELECT id, response, "agentId",
            1 - ("queryEmbedding" <=> $1::vector) AS similarity
     FROM "KrakenCache"
     WHERE "expiresAt" > NOW()
       AND "queryEmbedding" IS NOT NULL
       AND 1 - ("queryEmbedding" <=> $1::vector) > $2
     ORDER BY "queryEmbedding" <=> $1::vector
     LIMIT 1`,
    embeddingStr,
    threshold
  );

  if (results.length === 0) return null;

  const hit = results[0];

  // Increment hit count
  await prisma.krakenCache.update({
    where: { id: hit.id },
    data: { hitCount: { increment: 1 } },
  });

  return {
    id: hit.id,
    response: hit.response,
    agent: hit.agentId,
    similarity: hit.similarity,
  };
}

/**
 * Cache a response for future semantic matching.
 */
export async function cacheResponse(
  query: string,
  response: string,
  agentId: string | null,
  ttlDays = 7
) {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = embeddingToSql(queryEmbedding);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "KrakenCache" ("id", "queryText", "queryEmbedding", "response", "agentId", "hitCount", "createdAt", "expiresAt")
     VALUES (gen_random_uuid(), $1, $2::vector, $3, $4, 0, NOW(), $5)`,
    query,
    embeddingStr,
    response,
    agentId,
    expiresAt
  );
}
