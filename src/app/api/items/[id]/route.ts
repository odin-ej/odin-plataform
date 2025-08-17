import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { itemSchema } from "@/lib/schemas/reservationsSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const validation = itemSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
    }

    const updatedItem = await prisma.reservableItem.update({
      where: { id },
      data: validation.data,
    });
    revalidatePath('/central-de-reservas')
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao atualizar item." }, { status: 500 });
  }
}

// --- DELETE: apagar item ---
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    await prisma.reservableItem.delete({ where: { id } });
   revalidatePath('/central-de-reservas')
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao apagar item." }, { status: 500 });
  }
}