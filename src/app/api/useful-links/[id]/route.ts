import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { linkSchema } from "@/lib/schemas/linksSchema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const validation = linkSchema.safeParse(body);


    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
    }

    const updatedLink = await prisma.usefulLink.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(updatedLink, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao atualizar link", error },
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

    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;

    const deletedLink = await prisma.usefulLink.delete({
      where: { id },
    });

    return NextResponse.json(deletedLink, {
      status: 200,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao apagar link", error },
      { status: 500 }
    );
  }
}
