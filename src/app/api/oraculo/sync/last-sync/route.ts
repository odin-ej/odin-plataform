import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    // Busca o arquivo com a data de atualização mais recente.
    // A data 'updatedAt' é atualizada automaticamente pelo Prisma em cada 'upsert'.
    const lastSyncLog = await prisma.syncLog.findFirst({
      where: {
        service: "GOOGLE_DRIVE_SYNC", // Filtra pelo serviço específico de sincronização
        status: "SUCCESS", // Garante que a sincronização foi concluída com sucesso
      },
      orderBy: {
        finishedAt: 'desc', // Ordena para pegar o mais recente
      },
    });

    if (!lastSyncLog || !lastSyncLog.finishedAt) {
      return NextResponse.json({ lastSync: null, message: "Nenhuma sincronização foi realizada ainda." });
    }

    // Retorna a data de conclusão do último log de sucesso.
    return NextResponse.json({ lastSync: lastSyncLog.finishedAt });
  } catch (error) {
    console.error("Erro ao buscar data da última sincronização:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro no servidor ao buscar a data." },
      { status: 500 }
    );
  }
}
