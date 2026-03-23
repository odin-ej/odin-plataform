import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import {  DIRECTORS_ONLY } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { checkUserPermission } from "@/lib/utils";

export async function PATCH(request: Request) {
  try {
    // 1. Verifica se o usuário é um diretor
    const user = await getAuthenticatedUser();

    if(!user) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 401 });
    }

    if (!checkUserPermission(user, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const { isHidden } = await request.json();

    // Validação simples
    if (typeof isHidden !== 'boolean') {
        return NextResponse.json({ message: "Valor 'isHidden' inválido." }, { status: 400 });
    }

    // 2. Atualiza a configuração no banco de dados
    await prisma.jRPointsRanking.upsert({
      where: { id: 1 },
      update: { isHidden },
      create: { id: 1, isHidden }, // Cria a entrada se ela não existir
    });

    // 3. Revalida o cache da página para que a mudança seja refletida
    revalidatePath('/jr-points');

    return NextResponse.json({ message: "Visibilidade do ranking atualizada." });

  } catch (error) {
    console.error("Erro ao atualizar visibilidade do ranking:", error);
    return NextResponse.json({ message: "Ocorreu um erro no servidor." }, { status: 500 });
  }
}
