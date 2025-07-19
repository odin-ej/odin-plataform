import { roleCreateSchema } from "@/lib/schemas/roleSchema";
import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-utils";

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return NextResponse.json(roles);
  } catch (error) {
    console.error("Erro ao buscar cargos:", error);
    return NextResponse.json(
      { message: "Erro ao buscar cargos." },
      { status: 500 }
    );
  }
}

// --- FUNÇÃO POST: Criar um novo cargo ---
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const body = await request.json();

    // Valida o corpo do pedido com o schema Zod
    const validation = roleCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: validation.error.formErrors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, description, area } = validation.data;

    // Verifica se o cargo já existe
    const existingRole = await prisma.role.findUnique({ where: { name } });
    if (existingRole) {
      return NextResponse.json(
        { message: "Um cargo com este nome já existe." },
        { status: 409 }
      );
    }

    // Cria o cargo na base de dados
    const newRole = await prisma.role.create({
      data: {
        name,
        description,
        area,
      },
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar cargo:", error);
    return NextResponse.json(
      { message: "Erro ao criar cargo." },
      { status: 500 }
    );
  }
}
