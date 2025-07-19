import { z } from "zod";
import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/server-utils";

const addTagToUsersSchema = z.object({
  userIds: z.array(z.string()).min(1, "Selecione pelo menos um utilizador."),
  tagId: z.string({ required_error: "É necessário selecionar uma tag." }),
});

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = addTagToUsersSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { userIds, tagId } = validation.data;

    const templateTag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!templateTag) {
      return NextResponse.json(
        { message: "A tag selecionada não foi encontrada." },
        { status: 404 }
      );
    }

    // CORREÇÃO: A lógica da transação foi reestruturada para ser mais explícita e robusta.
await prisma.$transaction(async (tx) => {
      for (const userId of userIds) {
        if (userId === 'enterprise-points-id') {
          // --- LÓGICA CORRIGIDA PARA A EMPRESA ---

          // 1. Garante que o registo de pontos da empresa existe e atualiza o valor.
          const enterprisePoints = await tx.enterprisePoints.upsert({
            where: { id: 1 },
            update: { value: { increment: templateTag.value } },
            create: {
              id: 1,
              value: templateTag.value,
              description: "Pontuação geral da Empresa JR.",
            },
          });

          // 2. Cria a nova tag "clone", conectando-a explicitamente ao registo de pontos da empresa.
          await tx.tag.create({
            data: {
              description: templateTag.description,
              value: templateTag.value,
              datePerformed: new Date(),
              actionTypeId: templateTag.actionTypeId,
              enterprisePointsId: enterprisePoints.id, // Conexão explícita
            },
          });

        } else {
          // --- LÓGICA PARA USUÁRIOS NORMAIS ---

          // 1. Garante que o registo de pontos do usuário existe e atualiza o total de pontos.
          const userPoints = await tx.userPoints.upsert({
            where: { userId },
            update: { totalPoints: { increment: templateTag.value } },
            create: {
              userId,
              totalPoints: templateTag.value,
            },
          });

          // 2. Cria a nova tag "clone", conectando-a explicitamente ao registo de pontos do usuário.
          await tx.tag.create({
            data: {
              description: templateTag.description,
              value: templateTag.value,
              datePerformed: new Date(),
              actionTypeId: templateTag.actionTypeId,
              userPointsId: userPoints.id, // Conexão explícita
            },
          });
        }
      }
    });

    revalidatePath("/jr-points/nossa-empresa");
    revalidatePath("/jr-points");
    return NextResponse.json({
      message: `${userIds.length} item(ns) receberam a tag com sucesso!`,
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao adicionar tag:", error);
    return NextResponse.json(
      { message: "Erro ao adicionar tag.", error: error.message },
      { status: 500 }
    );
  }
}
