import { actionTypeSchema } from "@/lib/schemas/pointsSchema";
import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/server-utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    const {id} = await params
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const body = await request.json();
    const validation = actionTypeSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
    }
    const updatedAction = await prisma.actionType.update({
      where: { id },
      data: validation.data,
    });
    revalidatePath("/jr-points/nossa-empresa");
    return NextResponse.json(updatedAction);
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao atualizar tag.", error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    const {id} = await params
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    await prisma.actionType.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Trata o erro caso a tag esteja em uso
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          message:
            "Não é possível apagar esta action pois ela já está associada a um ou mais utilizadores.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Erro ao apagar tag.", error },
      { status: 500 }
    );
  }
}
