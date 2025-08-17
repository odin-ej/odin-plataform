import { prisma } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const enterpriseTags = await prisma.tag.findMany({
      where: { enterprisePointsId: 1,  }, // ID fixo para a empresa
      include: {
        actionType: { select: { name: true } },
        assigner: { select: { name: true } },
      },

      orderBy: { datePerformed: "desc" },
    });
    return NextResponse.json(enterpriseTags);
  } catch (error) {
    console.error("Erro ao buscar tags da empresa:", error);
    return NextResponse.json({ message: "Erro ao buscar dados." }, { status: 500 });
  }
}