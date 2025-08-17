/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import z from "zod";

// Schema para atualizar um TagTemplate
const tagTemplateUpdateSchema = z
  .object({
    name: z.string().min(3).optional(),
    description: z.string().min(5).optional(),
    baseValue: z.number().optional(),
    actionTypeId: z.string().optional(),
    isScalable: z.boolean().optional(),
    escalationMultiplier: z.number().optional(),
    escalationCondition: z.string().optional(),
  })
  .partial();

/**
 * @description Rota para ATUALIZAR um TagTemplate e propagar as mudanças.
 * ATENÇÃO: A atualização de 'baseValue' é complexa e pode recalcular pontos.
 * Por segurança, esta implementação foca em atualizar dados textuais.
 * A lógica de recalcular pontos foi comentada e pode ser ativada se necessário.
 */
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
    const { id } = await params; // ID do TagTemplate
    const body = await request.json();

    const validation = tagTemplateUpdateSchema.safeParse(body);
    if (!validation.success || Object.keys(validation.data).length === 0) {
      return NextResponse.json(
        {
          message: "Nenhum dado válido para atualização fornecido.",
          errors: validation?.error?.flatten(),
        },
        { status: 400 }
      );
    }

    const originalTemplate = await prisma.tagTemplate.findUnique({
      where: { id },
    });
    if (!originalTemplate) {
      return NextResponse.json(
        { message: "Modelo de tag não encontrado." },
        { status: 404 }
      );
    }

    // Atualiza o template
    const updatedTemplate = await prisma.tagTemplate.update({
      where: { id },
      data: validation.data,
    });

    // Propaga mudanças de dados textuais para as instâncias existentes
    // Apenas atualiza a descrição se ela não tiver sido customizada na instância
    await prisma.tag.updateMany({
      where: {
        templateId: id,
        description: originalTemplate.description, // Só atualiza se a descrição for a mesma do template original
      },
      data: {
        description: updatedTemplate.description,
      },
    });

    revalidatePath("/gerenciar-jr-points");
    return NextResponse.json(updatedTemplate);
  } catch (error: any) {
    console.error("Erro ao atualizar o modelo de tag:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar o modelo de tag.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * @description Rota para DELETAR um TagTemplate e todas as suas instâncias, revertendo os pontos.
 */
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
    const { id } = await params; // ID do TagTemplate

    await prisma.$transaction(async (tx) => {
      // 1. Encontrar todas as instâncias de tags criadas a partir deste template
      const tagInstances = await tx.tag.findMany({
        where: { templateId: id },
        select: { id: true, value: true, userPointsId: true },
      });

      if (tagInstances.length > 0) {
        // 2. Reverter os pontos de cada usuário afetado
        for (const instance of tagInstances) {
          if (instance.userPointsId) {
            await tx.userPoints.update({
              where: { id: instance.userPointsId },
              data: { totalPoints: { decrement: instance.value } },
            });
          }
        }

        // 3. Deletar todas as instâncias encontradas
        const instanceIds = tagInstances.map((inst) => inst.id);
        await tx.tag.deleteMany({
          where: { id: { in: instanceIds } },
        });
      }

      // 4. Deletar o TagTemplate
      await tx.tagTemplate.delete({
        where: { id },
      });
    });

    revalidatePath("/gerenciar-jr-points");
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Erro ao deletar modelo de tag:", error);
    return NextResponse.json(
      { message: "Erro ao deletar modelo de tag.", error: error.message },
      { status: 500 }
    );
  }
}
