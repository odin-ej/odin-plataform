import { prisma } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const estrategyPlan = await prisma.estrategyPlan.findFirst({
      select: {
         vision: true
      }
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