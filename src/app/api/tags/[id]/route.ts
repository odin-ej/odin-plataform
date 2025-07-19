/* eslint-disable @typescript-eslint/no-explicit-any */
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { tagSchema } from "@/lib/schemas/pointsSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const isDirector = checkUserPermission(authUser, DIRECTORS_ONLY);

  if (!isDirector) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    // Construir objeto de atualização dinamicamente
    const dataToUpdate: { [key: string]: any } = {};

    // --- Caso 1: DESVINCULAR TAG ---
    if (body.userPointsId === null) {
      // Buscar a tag original com valor e relação atual
      const tag = await prisma.tag.findUnique({
        where: { id },
        include: {
          userPoints: true,
        },
      });

      if (!tag || !tag.userPointsId) {
        return NextResponse.json(
          { message: "Tag não encontrada ou já desvinculada." },
          { status: 404 }
        );
      }

      // Atualiza totalPoints do usuário revertendo o valor da tag
      await prisma.userPoints.update({
        where: { id: tag.userPointsId },
        data: {
          totalPoints: {
            increment: -tag.value, // Garante que remove corretamente mesmo se tag.value for negativo
          },
        },
      });

      // Define a desvinculação
      dataToUpdate.userPointsId = null;
    }

    // --- Caso 2: Atualizar dados da tag (descrição, valor, etc.) ---
    const validation = tagSchema.partial().safeParse(body);
    if (validation.success && Object.keys(validation.data).length > 0) {
      Object.assign(dataToUpdate, validation.data);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { message: "Nenhum dado válido para atualização foi fornecido." },
        { status: 400 }
      );
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: dataToUpdate,
    });

    revalidatePath("/jr-points/nossa-empresa");
    return NextResponse.json(updatedTag);
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao atualizar a tag.", error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const isDirector = checkUserPermission(authUser, DIRECTORS_ONLY);

  if (!isDirector) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Usa uma transação para garantir que a reversão de pontos e a exclusão ocorram juntas
    
    await prisma.$transaction(
      async (tx: {
        tag: {
          findUnique: (arg0: { where: { id: string } }) => any;
          delete: (arg0: { where: { id: string } }) => any;
        };
        userPoints: {
          update: (arg0: {
            where: { id: any };
            data: { totalPoints: { decrement: any } };
          }) => any;
        };
        enterprisePoints: {
          update: (arg0: {
            where: { id: any };
            data: { value: { decrement: any } };
          }) => any;
        };
      }) => {
        // 1. Encontra a tag que será deletada para verificar se ela tem pontos associados
        const tagToDelete = await tx.tag.findUnique({
          where: { id },
        });

        if (!tagToDelete) {
          throw new Error("Tag não encontrada.");
        }

        // 2. Se a tag estava associada a um usuário, reverte os pontos
        if (tagToDelete.userPointsId) {
          await tx.userPoints.update({
            where: { id: tagToDelete.userPointsId },
            data: {
              totalPoints: { decrement: tagToDelete.value },
            },
          });
        }

        // 3. Se a tag estava associada à empresa, reverte os pontos
        if (tagToDelete.enterprisePointsId) {
          await tx.enterprisePoints.update({
            where: { id: tagToDelete.enterprisePointsId },
            data: {
              value: { decrement: tagToDelete.value },
            },
          });
        }

        // 4. Finalmente, deleta a tag
        await tx.tag.delete({ where: { id } });
      }
    );

    revalidatePath("/jr-points/nossa-empresa");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao apagar tag.", error },
      { status: 500 }
    );
  }
}
