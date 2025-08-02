import { z } from "zod";
import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission, parseBrazilianDate } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";

// Schema para validar os dados recebidos (uma lista de IDs de tags)
const addTagsToEnterpriseSchema = z.object({
  tagIds: z.array(z.string()).min(1, "Selecione pelo menos uma tag."),
  datePerformed: z.string().min(5, "A data de realização é obrigatória."),
});

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

    if (!hasPermission) {
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

    const { tagIds, datePerformed } = validation.data;

    const formatedDate =
      typeof datePerformed === "string"
        ? (parseBrazilianDate(datePerformed) as Date)
        : new Date(datePerformed);

    // A ID do registo de EnterprisePoints é sempre 1, conforme o seu schema.
    const enterprisePointsId = 1;

    // Uma transação garante que todas as operações são bem-sucedidas.
    await prisma.$transaction(async (tx) => {
      // ✅ PASSO ADICIONADO: Garante que o registo da empresa existe.
      await tx.enterprisePoints.upsert({
        where: { id: enterprisePointsId },
        update: {}, // Não precisamos de atualizar nada se já existir
        create: {
          id: enterprisePointsId,
          value: 0,
          description: "Pontuação geral da empresa",
        },
      });

      // O resto da sua lógica agora pode correr em segurança
      for (const tagId of tagIds) {
        const templateTag = await tx.tag.findUnique({ where: { id: tagId } });

        if (!templateTag) {
          throw new Error(`A tag com ID ${tagId} não foi encontrada.`);
        }

        await tx.tag.create({
          data: {
            description: templateTag.description,
            value: templateTag.value,
            datePerformed: formatedDate,
            actionTypeId: templateTag.actionTypeId,
            enterprisePointsId: enterprisePointsId,
            assignerId: authUser.id,
          },
        });

        await tx.enterprisePoints.update({
          where: { id: enterprisePointsId },
          data: {
            value: { increment: templateTag.value },
          },
        });
      }
    });

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
