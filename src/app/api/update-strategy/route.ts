import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { NextResponse } from "next/server";
import { AppAction } from "@/lib/permissions";
export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser || !await can(authUser, AppAction.UPDATE_STRATEGY)) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const estrategyPlan = await prisma.estrategyPlan.findFirst({
      include: { values: true, estrategyObjectives: { include: {goals: true}} },
    });

    return NextResponse.json(estrategyPlan);
  } catch (error) {
    console.error("Erro ao buscar missão:", error);
    return NextResponse.json(
      { message: "Erro ao buscar missão." },
      { status: 500 }
    );
  }
}
