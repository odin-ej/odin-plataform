/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { roleUpdateSchema } from "@/lib/schemas/roleSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const role = await prisma.role.findUnique({ where: { id } });

    if (!role) {
      return NextResponse.json(
        { message: "Cargo não encontrado." },
        { status: 404 }
      );
    }
    return NextResponse.json(role);
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao buscar cargo." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();

    const hasPermission = checkUserPermission(user, DIRECTORS_ONLY);

    if (!user || !hasPermission) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = roleUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Dados de atualização inválidos.",
          errors: validation.error.formErrors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: validation.data,
    });

    revalidatePath("/");
    revalidatePath("/gerenciar-cargos");
    revalidatePath("/perfil");
    return NextResponse.json(updatedRole);
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao atualizar cargo." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();

    const hasPermission = checkUserPermission(user, DIRECTORS_ONLY);

    if (!user || !hasPermission) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const existingRole = await prisma.role.findUnique({
      where: { id },
    });
    if (!existingRole) {
      return NextResponse.json(
        { message: "Cargo não encontrado." },
        { status: 404 }
      );
    }

    await prisma.role.delete({
      where: { id },
    });
    revalidatePath("/");
    revalidatePath("/gerenciar-cargos");
    revalidatePath("/perfil");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Trata o erro caso o cargo esteja a ser usado por um utilizador
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error instanceof PrismaClientKnownRequestError &&
      (error as { code: string }).code === "P2003"
    ) {
      return NextResponse.json(
        {
          message:
            "Não é possível apagar este cargo pois ele está associado a um ou mais utilizadores.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Erro ao apagar cargo." },
      { status: 500 }
    );
  }
}
