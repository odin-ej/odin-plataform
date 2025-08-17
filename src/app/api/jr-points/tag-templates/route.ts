import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { tagTemplateSchema } from "@/lib/schemas/pointsSchema";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);
  if (!hasPermission) {
    return NextResponse.json({ message: "Acesso negado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = tagTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      baseValue,
      actionTypeId,
      areas,
      ...escalationData
    } = validation.data;

    const activeVersion = await prisma.jRPointsVersion.findFirst({
      where: { isActive: true },
    });

    const newTagTemplate = await prisma.tagTemplate.create({
      data: {
        name,
        description,
        baseValue,
        actionTypeId,
        areas,
        // O campo 'areas' não existe no TagTemplate, ele é definido na instância da Tag.
        // Se for necessário, adicione-o ao schema do TagTemplate.
        ...escalationData,
        jrPointsVersionId: activeVersion?.id ?? "",
      },
    });
    revalidatePath("/gerenciar-jr-points");
    return NextResponse.json(newTagTemplate, { status: 201 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao criar template de tag:", error);
    return NextResponse.json(
      { message: "Erro ao criar template de tag.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * @description Rota para LISTAR todos os TagTemplates (moldes de tags) disponíveis.
 */
export async function GET() {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    // Retorna os moldes, que são o que os usuários selecionam para atribuir.
    const templates = await prisma.tagTemplate.findMany({
      where: {
        jrPointsVersion: {
          isActive: true,
        },
      },
      include: {
        actionType: true, // Inclui a categoria para melhor exibição no frontend
      },
      orderBy: {
        name: "asc",
      },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Erro ao buscar templates de tags:", error);
    return NextResponse.json(
      { message: "Erro ao buscar templates de tags." },
      { status: 500 }
    );
  }
}
