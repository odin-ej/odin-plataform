import { z } from "zod";
import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/server-utils";

// Schema para validar os dados recebidos (uma lista de IDs de tags)
const addTagsToEnterpriseSchema = z.object({
  tagIds: z.array(z.string()).min(1, "Selecione pelo menos uma tag."),
});

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = addTagsToEnterpriseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: validation.error.formErrors },
        { status: 400 }
      );
    }

    const { tagIds } = validation.data;

    // A ID do registo de EnterprisePoints é sempre 1, conforme o seu schema.
    const enterprisePointsId = 1;

    // Uma transação garante que todas as operações são bem-sucedidas.
    await prisma.$transaction(async (tx) => {
      for (const tagId of tagIds) {
        // 1. Encontra a tag "molde" para obter os seus dados.
        const templateTag = await tx.tag.findUnique({
          where: { id: tagId },
        });

        if (!templateTag) {
          throw new Error(`A tag com ID ${tagId} não foi encontrada.`);
        }

        // 2. Cria uma nova tag (uma cópia) para ser associada à empresa.
        await tx.tag.create({
          data: {
            description: templateTag.description,
            value: templateTag.value,
            datePerformed: new Date(),
            actionTypeId: templateTag.actionTypeId,
            // 3. Conecta a nova tag diretamente ao registo de pontos da empresa.
            enterprisePointsId: enterprisePointsId,
          },
        });
        await tx.enterprisePoints.update({
          where: { id: enterprisePointsId },
          data: {
            value: {
            increment: templateTag.value,
            },
          },
        })
      }
    });

    // Revalida o cache da página para mostrar os dados atualizados.

    revalidatePath("/jr-points/nossa-empresa");
    return NextResponse.json({
      message: `${tagIds.length} tag(s) adicionada(s) à empresa com sucesso!`,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao adicionar tags à empresa:", error);
    return NextResponse.json(
      { message: "Erro ao adicionar tags à empresa.", error: error.message },
      { status: 500 }
    );
  }
}
