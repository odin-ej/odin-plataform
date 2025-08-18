import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { cultureUpdateSchema } from "@/lib/schemas/strategyUpdateSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const [estrategyRes, usersRes, rolesRes, interestRes, categoriesInterestRes, semestersRes] = await Promise.all([
      prisma.estrategyPlan.findMany({
        include: {
          values: true,
          estrategyObjectives: true,
        },
      }),
      prisma.user.findMany({
        where: { id: { not: "f34cea1a-c091-709f-d7ae-ac6583665cbd" } },
        include: {
          roles: true,
          currentRole: true,
          roleHistory: { include: { role: true } },
          professionalInterests: { include: { category: true } },
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.role.findMany({
        orderBy: {
          name: "asc",
        },
      }),
      prisma.professionalInterest.findMany({
        orderBy: {
          name: 'asc',
        }
      }),
      prisma.interestCategory.findMany({
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.semester.findMany({
        orderBy: {
          endDate: 'desc'
        }
      })
    ]);
    return NextResponse.json({ estrategyRes, usersRes, rolesRes, interestRes, categoriesInterestRes,semestersRes });
  } catch (error) {
    console.error("Erro ao buscar dados da pagina de cultura:", error);
    return NextResponse.json(
      { message: "Erro ao buscar culturas." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  // Adicione aqui a lógica para verificar se o usuário tem permissão para editar a cultura
  const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

  if (!hasPermission) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const validation = cultureUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const updatedCulture = await prisma.estrategyPlan.update({
      where: { id: 1 },
      data: validation.data,
    });

    revalidatePath("/atualizar-estrategia");
    return NextResponse.json(updatedCulture);
  } catch (error) {
    return NextResponse.json(
      { error: `Erro ao atualizar estratégia: ${error}` },
      { status: 500 }
    );
  }
}
