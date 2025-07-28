import { z } from "zod";
import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { parseBrazilianDate } from "@/lib/utils";

const addTagToUsersSchema = z.object({
  userIds: z.array(z.string()).min(1, "Selecione pelo menos um utilizador."),
  tagId: z.string({ required_error: "É necessário selecionar uma tag." }),
  datePerformed: z.string().min(5, "A data de realização é obrigatória."),
  assignerId: z.string().optional(),
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
        {
          message: "Dados inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { userIds, tagId, datePerformed } = validation.data;

    const formatedDate =
      typeof datePerformed === "string"
        ? (parseBrazilianDate(datePerformed) as Date)
        : new Date(datePerformed);
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
            assignerId: validation.data.assignerId || authUser.id,
            datePerformed: formatedDate,
            actionTypeId: templateTag.actionTypeId,
            userPointsId: userPoints.id, // Conexão explícita
          },
        });
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
