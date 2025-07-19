import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { linkSchema } from "@/app/_components/Dashboard/UsefulLinksSection";

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

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    const link = await prisma.usefulLink.findUnique({
      where: { id },
    });

    if (link?.userId !== user?.id) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

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
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    const link = await prisma.usefulLink.findUnique({
      where: { id },
    });

    if (link?.userId !== user?.id) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

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
