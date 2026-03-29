import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextResponse } from "next/server";

/**
 * POST /api/kraken/knowledge/docs/generate
 * Triggers documentation generation from the Odin codebase.
 * This is a lightweight endpoint that returns immediately.
 * The actual generation happens via the CLI script: npx tsx scripts/generate-odin-docs.ts
 */
export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    // Get current doc count
    const docCount = await prisma.krakenOdinDoc.count();

    return NextResponse.json({
      message:
        "Para gerar a documentação do Odin, execute no terminal: npx tsx scripts/generate-odin-docs.ts",
      currentDocCount: docCount,
      lastSync: await prisma.krakenOdinDoc.findFirst({
        orderBy: { lastSyncedAt: "desc" },
        select: { lastSyncedAt: true },
      }),
    });
  } catch (error) {
    console.error("[Kraken Docs Generate] error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * GET /api/kraken/knowledge/docs/generate
 * List auto-generated Odin docs.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const docs = await prisma.krakenOdinDoc.findMany({
      orderBy: { featureName: "asc" },
      select: {
        id: true,
        featurePath: true,
        featureName: true,
        description: true,
        category: true,
        generatedFrom: true,
        isActive: true,
        lastSyncedAt: true,
      },
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("[Kraken Odin Docs] GET error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
