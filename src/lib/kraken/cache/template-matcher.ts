import prisma from "@/db";
import { generateEmbedding, embeddingToSql } from "../embeddings";

interface TemplateMatch {
  id: string;
  response: string;
  agentId: string | null;
  questionExample: string;
  similarity: number;
}

/**
 * Find a matching template by keyword or embedding similarity.
 * Templates are pre-produced responses — no API call needed.
 */
export async function findTemplateMatch(
  query: string,
  threshold = 0.92
): Promise<TemplateMatch | null> {
  const queryLower = query.toLowerCase().trim();

  // 1. First try keyword matching (free — no API call)
  const templates = await prisma.krakenTemplate.findMany({
    where: { isActive: true },
  });

  for (const template of templates) {
    for (const keyword of template.triggerKeywords) {
      if (queryLower.includes(keyword.toLowerCase())) {
        await prisma.krakenTemplate.update({
          where: { id: template.id },
          data: { usageCount: { increment: 1 } },
        });
        return {
          id: template.id,
          response: template.response,
          agentId: template.agentId,
          questionExample: template.questionExample,
          similarity: 1.0,
        };
      }
    }
  }

  // 2. If no keyword match, try embedding similarity (costs one embedding call)
  const templatesWithEmbedding = templates.filter(
    // Templates with triggerEmbedding (checked via existence in DB)
    (t) => t.triggerKeywords.length > 0
  );

  if (templatesWithEmbedding.length === 0) return null;

  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = embeddingToSql(queryEmbedding);

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      response: string;
      agentId: string | null;
      questionExample: string;
      similarity: number;
    }>
  >(
    `SELECT id, response, "agentId", "questionExample",
            1 - ("triggerEmbedding" <=> $1::vector) AS similarity
     FROM "KrakenTemplate"
     WHERE "isActive" = true
       AND "triggerEmbedding" IS NOT NULL
       AND 1 - ("triggerEmbedding" <=> $1::vector) > $2
     ORDER BY "triggerEmbedding" <=> $1::vector
     LIMIT 1`,
    embeddingStr,
    threshold
  );

  if (results.length === 0) return null;

  const match = results[0];

  await prisma.krakenTemplate.update({
    where: { id: match.id },
    data: { usageCount: { increment: 1 } },
  });

  return match;
}
