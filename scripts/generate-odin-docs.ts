/**
 * Generate Odin platform documentation from source code.
 * This script analyzes page.tsx files and generates documentation
 * for the Odin IA agent to use via RAG.
 *
 * Usage: npx tsx scripts/generate-odin-docs.ts
 */

import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Simple glob replacement: find all page.tsx files recursively
function findPageFiles(dir: string, results: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith("node_modules") && !entry.name.startsWith("_components")) {
      findPageFiles(fullPath, results);
    } else if (entry.name === "page.tsx") {
      results.push(fullPath.replace(/\\/g, "/"));
    }
  }
  return results;
}

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

function embeddingToSql(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function extractFeatureName(pagePath: string): string {
  const parts = pagePath
    .replace(/\\/g, "/")
    .replace("src/app/", "")
    .replace("/page.tsx", "")
    .replace("(dashboard)/", "")
    .replace("(auth)/", "");
  return parts || "Home";
}

function inferCategory(pagePath: string): string {
  const normalized = pagePath.replace(/\\/g, "/").toLowerCase();
  if (normalized.includes("chat") || normalized.includes("ia") || normalized.includes("kraken"))
    return "IA";
  if (normalized.includes("usuario") || normalized.includes("perfil") || normalized.includes("cargo"))
    return "Membros";
  if (normalized.includes("inovacao") || normalized.includes("idea"))
    return "Inovação";
  if (normalized.includes("comunidade") || normalized.includes("channel"))
    return "Comunidade";
  if (normalized.includes("jr-point") || normalized.includes("ponto"))
    return "JR Points";
  if (normalized.includes("tarefa") || normalized.includes("task"))
    return "Tarefas";
  if (normalized.includes("reserva") || normalized.includes("sala"))
    return "Reservas";
  if (normalized.includes("report")) return "Reports";
  if (normalized.includes("reconhecimento")) return "Reconhecimentos";
  if (normalized.includes("cultural")) return "Cultural";
  if (normalized.includes("meta") || normalized.includes("okr"))
    return "Estratégia";
  if (normalized.includes("oraculo")) return "Oráculo";
  return "Geral";
}

async function analyzePageWithAI(
  pagePath: string,
  code: string
): Promise<string> {
  // Truncate very long files
  const truncatedCode = code.length > 8000 ? code.slice(0, 8000) + "\n\n... (truncado)" : code;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    system: `Analise este código de uma página Next.js e gere documentação em markdown. Extraia:
- Nome da funcionalidade
- O que o usuário pode fazer nesta página
- Componentes e interações principais
- Permissões ou roles necessárias (se visíveis no código)
- URL/rota da página

Formato da resposta:
# [Nome da Feature]
## Descrição
...
## O que o usuário pode fazer
...
## Permissões necessárias
...
## Rota
...`,
    messages: [
      {
        role: "user",
        content: `Arquivo: ${pagePath}\n\nCódigo:\n${truncatedCode}`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function generateOdinDocs() {
  console.log("📚 Generating Odin platform documentation...\n");

  // Find all page.tsx files
  const pages = findPageFiles("src/app");

  console.log(`Found ${pages.length} pages to analyze.\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const pagePath of pages) {
    const fullPath = pagePath;

    if (!existsSync(fullPath)) {
      console.log(`  ⚠️ File not found: ${fullPath}`);
      skipped++;
      continue;
    }

    const code = readFileSync(fullPath, "utf-8");
    const codeHash = crypto.createHash("md5").update(code).digest("hex");

    // Check if we already have a doc for this path with the same hash
    const existing = await prisma.krakenOdinDoc.findUnique({
      where: { featurePath: pagePath },
    });

    if (existing) {
      const existingMeta = existing.description;
      if (existingMeta.includes(codeHash)) {
        console.log(`  ⏭️ Skipping (unchanged): ${pagePath}`);
        skipped++;
        continue;
      }
    }

    console.log(`  🔍 Analyzing: ${pagePath}...`);

    try {
      const docContent = await analyzePageWithAI(pagePath, code);
      const featureName = extractFeatureName(pagePath);
      const category = inferCategory(pagePath);
      const description = `[hash:${codeHash}] ${docContent.slice(0, 200)}`;

      // Generate embedding for RAG
      const embedding = await generateEmbedding(docContent);
      const embeddingStr = embeddingToSql(embedding);

      if (existing) {
        await prisma.$executeRawUnsafe(
          `UPDATE "KrakenOdinDoc"
           SET "featureName" = $1, "description" = $2, "category" = $3,
               "content" = $4, "embedding" = $5::vector,
               "lastSyncedAt" = NOW(), "updatedAt" = NOW()
           WHERE "featurePath" = $6`,
          featureName,
          description,
          category,
          docContent,
          embeddingStr,
          pagePath
        );
        updated++;
        console.log(`  ✅ Updated: ${featureName}`);
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "KrakenOdinDoc"
           ("id", "featurePath", "featureName", "description", "category",
            "generatedFrom", "content", "embedding", "isActive",
            "lastSyncedAt", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'code_analysis', $5, $6::vector,
                   true, NOW(), NOW(), NOW())`,
          pagePath,
          featureName,
          description,
          category,
          docContent,
          embeddingStr
        );
        created++;
        console.log(`  ✅ Created: ${featureName}`);
      }

      // Also ingest into KrakenKnowledgeChunk for RAG
      // Delete existing chunks for this source
      await prisma.krakenKnowledgeChunk.deleteMany({
        where: { sourceName: pagePath, sourceType: "odin_docs" },
      });

      // Insert as a single chunk (docs are already concise)
      await prisma.$executeRawUnsafe(
        `INSERT INTO "KrakenKnowledgeChunk"
         ("id", "sourceType", "sourceName", "sourceUrl", "chunkIndex",
          "content", "contentEmbedding", "metadata", "agentScope",
          "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'odin_docs', $1, NULL, 0, $2, $3::vector,
                 '{}'::jsonb, ARRAY['odin_ia']::text[], true, NOW(), NOW())`,
        pagePath,
        docContent,
        embeddingStr
      );

      // Rate limit: wait a bit between API calls
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  ❌ Error analyzing ${pagePath}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total pages: ${pages.length}`);
  console.log("\n📚 Documentation generation complete!");
}

generateOdinDocs()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
