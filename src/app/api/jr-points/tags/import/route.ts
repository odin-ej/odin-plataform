import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { tagTemplateSchema } from "@/lib/schemas/pointsSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const importSchema = z.array(tagTemplateSchema);

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    const isDirector = checkUserPermission(authUser, DIRECTORS_ONLY);
    if (!isDirector)
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });

    const activeVersion = await prisma.jRPointsVersion.findFirst({
      where: { isActive: true },
    });

    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true },
    });

    if (!activeVersion || !activeSemester) {
      return new NextResponse(
        "Nenhuma versão ou semestre ativo encontrada para associar as tags.",
        { status: 400 }
      );
    }

    const body = await request.json();
    const formatedBody = body.map((tag: { areas: string }) => ({
      ...tag,
      areas: tag.areas.trim().split(","),
    }));
    const templatesToCreate = importSchema.parse(formatedBody);

    const creationData = templatesToCreate.map((template) => ({
      ...template,
      jrPointsVersionId: activeVersion.id,
    }));

    const result = await prisma.tagTemplate.createMany({
      data: creationData,
      skipDuplicates: true,
    });

    return NextResponse.json(
      { message: `${result.count} modelos de tag importados.` },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError)
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    console.error("[TAG_IMPORT_ERROR]", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
