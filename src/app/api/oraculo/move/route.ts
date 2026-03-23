import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { z } from "zod";

const moveSchema = z.object({
  itemId: z.string().uuid(),
  targetFolderId: z.string().uuid().nullable(),
});

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = moveSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
    }
    const { itemId, targetFolderId } = validation.data;

    // Tenta encontrar o item como se fosse um arquivo
    const file = await prisma.oraculoFile.findUnique({ where: { id: itemId } });

    if (file) {
      // É um arquivo
      await prisma.oraculoFile.update({
        where: { id: itemId },
        data: { folderId: targetFolderId },
      });
    } else {
      // Se não for um arquivo, deve ser uma pasta
      const folder = await prisma.oraculoFolder.findUnique({ where: { id: itemId } });
      if (!folder) {
        return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
      }
      
      // Validação: Impede que uma pasta seja movida para dentro de si mesma
      if (itemId === targetFolderId) {
        return NextResponse.json({ message: "Uma pasta não pode ser movida para dentro de si mesma." }, { status: 400 });
      }

      await prisma.oraculoFolder.update({
        where: { id: itemId },
        data: { parentId: targetFolderId },
      });
    }

    return NextResponse.json({ message: "Item movido com sucesso." });
  } catch (error) {
    console.error("Erro ao mover item:", error);
    return NextResponse.json({ message: "Erro interno do servidor." }, { status: 500 });
  }
}