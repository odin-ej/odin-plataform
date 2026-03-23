import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { NextResponse } from "next/server";
import { DIRECTORS_ONLY } from "@/lib/permissions";
export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
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
