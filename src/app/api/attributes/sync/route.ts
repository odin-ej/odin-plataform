import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

// Schemas para validar os dados que vêm do modal de gerenciamento
const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3, "Nome da categoria é obrigatório."),
});

const interestSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3, "Nome do interesse é obrigatório."),
  categoryId: z.string().min(1, "Todo interesse precisa de uma categoria."),
});

const syncSchema = z.object({
  categories: z.array(categorySchema),
  interests: z.array(interestSchema),
});

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const body = await request.json();
    const validation = syncSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos.", errors: validation.error.flatten() }, { status: 400 });
    }
    const { categories: incomingCategories, interests: incomingInterests } = validation.data;

    await prisma.$transaction(async (tx) => {
      // --- ETAPA 1: SINCRONIZAR CATEGORIAS ---
      const existingCategories = await tx.interestCategory.findMany();
      const existingCategoryIds = existingCategories.map(c => c.id);
      const incomingCategoryIdsWithId = incomingCategories.filter(c => c.id).map(c => c.id!);

      // 1a. Deletar categorias órfãs
      const categoryIdsToDelete = existingCategoryIds.filter(id => !incomingCategoryIdsWithId.includes(id));
      if (categoryIdsToDelete.length > 0) {
        await tx.interestCategory.deleteMany({ where: { id: { in: categoryIdsToDelete } } });
      }

      // 1b. Atualizar categorias existentes
      const categoriesToUpdate = incomingCategories.filter(c => c.id);
      if (categoriesToUpdate.length > 0) {
        await Promise.all(categoriesToUpdate.map(c => 
          tx.interestCategory.update({ where: { id: c.id! }, data: { name: c.name } })
        ));
      }

      // 1c. Criar novas categorias
      const categoriesToCreate = incomingCategories.filter(c => !c.id);
      if (categoriesToCreate.length > 0) {
        await tx.interestCategory.createMany({ data: categoriesToCreate.map(c => ({ name: c.name })) });
      }

      // --- ETAPA 2: OBTER MAPA DE CATEGORIAS ATUALIZADO ---
      // Após a sincronização, buscamos TODAS as categorias para ter um mapa definitivo de NOME -> ID.
      // Isso inclui as que acabamos de criar.
      const allFinalCategories = await tx.interestCategory.findMany();
      const categoryNameToIdMap = new Map(allFinalCategories.map(c => [c.name, c.id]));

      // --- ETAPA 3: SINCRONIZAR INTERESSES ---
      const existingInterests = await tx.professionalInterest.findMany();
      const existingInterestIds = existingInterests.map(i => i.id);
      const incomingInterestIdsWithId = incomingInterests.filter(i => i.id).map(i => i.id!);

      // 3a. Deletar interesses órfãos
      const interestIdsToDelete = existingInterestIds.filter(id => !incomingInterestIdsWithId.includes(id));
      if (interestIdsToDelete.length > 0) {
        await tx.professionalInterest.deleteMany({ where: { id: { in: interestIdsToDelete } } });
      }
      
      // 3b. Atualizar e Criar interesses
      const interestUpsertPromises = incomingInterests.map(interest => {
        // Resolve o ID da categoria. O frontend envia o ID para categorias existentes
        // ou o NOME para categorias recém-criadas.
        const finalCategoryId = categoryNameToIdMap.get(interest.categoryId) || interest.categoryId;
        
        if (!finalCategoryId || !allFinalCategories.some(c => c.id === finalCategoryId)) {
            throw new Error(`Categoria inválida ou não encontrada para o interesse '${interest.name}'`);
        }

        return tx.professionalInterest.upsert({
          where: { id: interest.id || '' },
          update: { name: interest.name, categoryId: finalCategoryId },
          create: { name: interest.name, categoryId: finalCategoryId },
        });
      });
      await Promise.all(interestUpsertPromises);
    });

    revalidatePath("/gerenciar-cargos");
    revalidatePath("/perfil");
    
    return NextResponse.json({ message: "Atributos sincronizados com sucesso!" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao sincronizar atributos:", error);
    if (error.message.includes("Não é possível deletar")) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    return NextResponse.json({ message: "Erro ao salvar alterações." }, { status: 500 });
  }
}