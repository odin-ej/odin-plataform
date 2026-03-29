import { prisma } from "@/db";
import { AppAction } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !(await can(user, AppAction.MANAGE_KRAKEN))) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const roles = await prisma.role.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error("[Kraken RateLimits] GET roles error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
