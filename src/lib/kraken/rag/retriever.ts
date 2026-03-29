import { prisma } from "@/db";
import { generateEmbedding, embeddingToSql } from "../embeddings";
import { KrakenKnowledgeResult } from "../types";

/**
 * Search the knowledge base for relevant chunks.
 *
 * Strategy:
 * 1. Find top matching chunks via embedding similarity
 * 2. Identify the most relevant SOURCE (file/document)
 * 3. Fetch MORE chunks from that same source for deeper context
 *
 * This prevents the problem where 15 "introduction" chunks from different
 * documents beat out the actual content chunks from the right document.
 */
export async function searchKnowledge(
  query: string,
  agentId: string,
  options: {
    topK?: number;
    threshold?: number;
  } = {}
): Promise<KrakenKnowledgeResult[]> {
  const { topK = 20, threshold = 0.25 } = options;

  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = embeddingToSql(queryEmbedding);

  // Step 1: Get initial matches (broad)
  const initialResults = await prisma.$queryRawUnsafe<
    Array<{
      content: string;
      sourceName: string;
      sourceUrl: string | null;
      metadata: string;
      similarity: number;
      chunkIndex: number;
    }>
  >(
    `SELECT content, "sourceName", "sourceUrl", metadata::text,
            1 - ("contentEmbedding" <=> $1::vector) AS similarity,
            "chunkIndex"
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

  if (initialResults.length === 0) {
    return [];
  }

  // Step 2: Find the most relevant SOURCE document(s)
  // Uses keyword matching from the query to boost relevant sources
  const queryLower = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const sourceScores = new Map<string, { count: number; maxSim: number; totalSim: number }>();
  for (const r of initialResults) {
    const existing = sourceScores.get(r.sourceName) ?? { count: 0, maxSim: 0, totalSim: 0 };
    existing.count++;
    existing.maxSim = Math.max(existing.maxSim, Number(r.similarity));
    existing.totalSim += Number(r.similarity);
    sourceScores.set(r.sourceName, existing);
  }

  // Rank sources with keyword boost from source name
  const rankedSources = Array.from(sourceScores.entries())
    .map(([name, stats]) => {
      // Keyword match boost: if source name contains query words, boost significantly
      const nameLower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      let keywordBoost = 0;
      for (const word of queryWords) {
        if (nameLower.includes(word)) {
          keywordBoost += 0.5; // big boost per matching word
        }
      }
      // Month/year matching gets extra boost
      const months = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      for (const month of months) {
        if (queryLower.includes(month) && nameLower.includes(month)) {
          keywordBoost += 1.0; // very large boost for month match
        }
      }
      const years = ["2024", "2025", "2026", "2027"];
      for (const year of years) {
        if (queryLower.includes(year) && nameLower.includes(year)) {
          keywordBoost += 0.8; // large boost for year match
        }
      }

      return {
        name,
        score: stats.count * 0.2 + stats.maxSim * 0.3 + keywordBoost,
        keywordBoost,
        ...stats,
      };
    })
    .sort((a, b) => b.score - a.score);

  const primarySource = rankedSources[0]?.name;
  console.log(`[RAG] Primary source: "${primarySource?.slice(0, 60)}" (boost: ${rankedSources[0]?.keywordBoost}, score: ${rankedSources[0]?.score.toFixed(2)})`);

  // Step 3: Fetch MORE chunks from the primary source — ordered by SIMILARITY
  // (not chunkIndex) so we get the most relevant parts of the document
  let deepResults: typeof initialResults = [];
  if (primarySource) {
    deepResults = await prisma.$queryRawUnsafe<typeof initialResults[0][]>(
      `SELECT content, "sourceName", "sourceUrl", metadata::text,
              1 - ("contentEmbedding" <=> $1::vector) AS similarity,
              "chunkIndex"
       FROM "KrakenKnowledgeChunk"
       WHERE "sourceName" = $2
         AND "isActive" = true
         AND "contentEmbedding" IS NOT NULL
       ORDER BY "contentEmbedding" <=> $1::vector
       LIMIT 30`,
      embeddingStr,
      primarySource
    );
  }

  // Step 4: Combine — primary source chunks first (sorted by chunkIndex for coherent reading),
  // then remaining unique chunks from other sources
  const seenContent = new Set<string>();
  const finalResults: KrakenKnowledgeResult[] = [];

  // Sort deep results by chunkIndex for coherent reading order
  deepResults.sort((a, b) => a.chunkIndex - b.chunkIndex);

  // Add primary source chunks (in document order)
  for (const r of deepResults) {
    const key = r.sourceName + "|" + r.chunkIndex;
    if (seenContent.has(key)) continue;
    seenContent.add(key);
    finalResults.push({
      content: r.content,
      sourceName: r.sourceName,
      sourceUrl: r.sourceUrl,
      similarity: Number(r.similarity),
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
    });
  }

  // Add chunks from other sources (limited to top 5)
  let otherCount = 0;
  for (const r of initialResults) {
    if (r.sourceName === primarySource) continue;
    const key = r.sourceName + "|" + r.chunkIndex;
    if (seenContent.has(key)) continue;
    seenContent.add(key);
    finalResults.push({
      content: r.content,
      sourceName: r.sourceName,
      sourceUrl: r.sourceUrl,
      similarity: Number(r.similarity),
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
    });
    otherCount++;
    if (otherCount >= 5) break;
  }

  return finalResults;
}

/**
 * Format RAG results into context string for injection into agent prompt.
 */
export function formatRagContext(results: KrakenKnowledgeResult[]): string {
  if (results.length === 0) {
    return "Nenhum documento relevante encontrado na base de conhecimento.";
  }

  // Group by source for cleaner output
  const bySource = new Map<string, KrakenKnowledgeResult[]>();
  for (const r of results) {
    const list = bySource.get(r.sourceName) ?? [];
    list.push(r);
    bySource.set(r.sourceName, list);
  }

  const sourceLabels: Record<string, string> = {
    google_drive: "Drive da Empresa",
    drive: "Drive da Empresa",
    manual: "Manual Interno",
    politicas: "Politicas da Empresa",
    processos: "Processos Internos",
    onboarding: "Material de Onboarding",
    okr: "Documentos de OKR",
    newsletter: "Newsletter",
    estrategia: "Planejamento Estrategico",
    odin_docs: "Documentacao da Plataforma",
    platform_manual: "Manual da Plataforma",
    glossario: "Glossario Interno",
    macroestrutura: "Macroestrutura da Empresa",
  };

  const sections: string[] = [];
  for (const [sourceName, chunks] of bySource) {
    const sourceType = (chunks[0]?.metadata?.sourceType as string) ?? "";
    const label = sourceLabels[sourceType] || sourceName;
    const cleanName = sourceName.replace(/^\[Drive\]\s*/, "");

    sections.push(
      `=== FONTE: ${label} — "${cleanName}" ===\n` +
      chunks.map((c) => c.content).join("\n\n") +
      "\n=== FIM DA FONTE ==="
    );
  }

  return sections.join("\n\n") +
    "\n\nIMPORTANTE: Ao responder, cite de onde veio a informacao. " +
    "Ex: 'Segundo o Drive da Empresa...' ou 'De acordo com o documento X...' " +
    "Voce TEM acesso ao conteudo acima — use-o para responder de forma completa e detalhada.";
}
