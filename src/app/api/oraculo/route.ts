import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { AppAction } from "@/lib/permissions";
import { OraculoAreas } from "@prisma/client";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const userAreas = (authUser.currentRole?.area as OraculoAreas[]) || [];
    const isDirector = await can(authUser, AppAction.MANAGE_AI_KNOWLEDGE);

    const whereClause = isDirector
      ? {}
      : {
          OR: [
            { restrictedToAreas: { isEmpty: true } },
            { restrictedToAreas: { has: OraculoAreas.GERAL } },
            { restrictedToAreas: { hasSome: userAreas } },
          ],
        };

    const [folders, files] = await Promise.all([
      prisma.oraculoFolder.findMany({
        where: whereClause,
        include: {
         owner: true,
         parent: true,
        },
      }),
      prisma.oraculoFile.findMany({
        where: whereClause,
        include: {
         owner: true,
         folder: true,
        },
      }),
    ]);

    return NextResponse.json({
      folders,
      files,
    });
  } catch (error) {
    console.error("Erro ao buscar dados do Oráculo:", error);
    return NextResponse.json(
      { message: "Erro ao buscar dados do Oráculo." },
      { status: 500 }
    );
  }
}
