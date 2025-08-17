import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { itemSchema } from "@/lib/schemas/reservationsSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const items = await prisma.reservableItem.findMany({ orderBy: { name: "asc" } });


    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao buscar itens." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const validation = itemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
    }

    const newItem = await prisma.reservableItem.create({ data: {
      ...validation.data,
    }});
    revalidatePath('/central-de-reservas')
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao criar item." }, { status: 500 });
  }
}