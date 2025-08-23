/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { TagAreas } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import z from "zod";

// Schema para atualizar um TagTemplate
const tagUpdateSchema = z
  .object({
    description: z.string().min(5).optional(),
    value: z.number().int().optional(),
    datePerformed: z.string().datetime().optional(), // Espera uma string no formato ISO 8601
    areas: z.array(z.nativeEnum(TagAreas)).optional(),
  })
  .partial();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser)
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const isDirector = checkUserPermission(authUser, DIRECTORS_ONLY);
  if (!isDirector)
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });

  try {
    const { id } = await params; // ID da Tag
    const body = await request.json();

    const validation = tagUpdateSchema.safeParse(body);
    if (!validation.success || Object.keys(validation.data).length === 0) {
      return NextResponse.json(
        {
          message: "Nenhum dado válido para atualização fornecido.",
          errors: validation.error?.flatten(),
        },
        { status: 400 }
      );
    }

    // Converte a data se ela for fornecida
    const dataToUpdate: any = { ...validation.data };
    if (validation.data.datePerformed) {
      dataToUpdate.datePerformed = new Date(validation.data.datePerformed);
    }

    const originalTag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!originalTag) {
      return NextResponse.json(
        { message: "Tag não encontrada." },
        { status: 404 }
      );
    }

    // LÓGICA PRINCIPAL: Usa uma transação para garantir consistência
    const updatedTag = await prisma.$transaction(async (tx) => {
      // 1. Calcula a diferença de pontos se o valor foi alterado
      const newValue = dataToUpdate.value ?? originalTag.value;
      const pointDifference = newValue - originalTag.value;

      // 2. Se houver diferença, atualiza os pontos do usuário
      if (pointDifference !== 0 && originalTag.userPointsId) {
        await tx.userPoints.update({
          where: { id: originalTag.userPointsId },
          data: { totalPoints: { increment: pointDifference } },
        });
      }

      // 3. Atualiza a tag com os novos dados
      const newTagData = await tx.tag.update({
        where: { id },
        data: dataToUpdate,
      });

      return newTagData;
    });

    revalidatePath("/gerenciar-jr-points");
    return NextResponse.json(updatedTag);
  } catch (error: any) {
    console.error("Erro ao atualizar a tag:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar a tag.", error: error.message },
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
  const { id } = await params;
  try {
    const tagToDelete = await prisma.tag.findUnique({ where: { id }, include: {userSemesterScore: true, enterpriseSemesterScore: true} });
    if (!tagToDelete) {
      return NextResponse.json(
        { message: "Tag não encontrada." },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (tagToDelete.userPointsId) {
        await tx.userPoints.update({
          where: { id: tagToDelete.userPointsId },
          data: { totalPoints: { decrement: tagToDelete.value } },
        });
        if(tagToDelete.userSemesterScore){
          await tx.userSemesterScore.update({
            where: { id: tagToDelete.userSemesterScore.id },
            data: { totalPoints: { decrement: tagToDelete.value } },
          });
        }
        if(tagToDelete.enterpriseSemesterScore){
          await tx.enterpriseSemesterScore.update({
            where: { id: tagToDelete.enterpriseSemesterScore.id },
            data: { value: { decrement: tagToDelete.value } },
          });
        }
      }
      await tx.tag.delete({ where: { id } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao deletar tag." },
      { status: 500 }
    );
  }
}
