import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";

const failureSchema = z.object({
  details: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
            return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
        }

        const body = await request.json();
        const { details } = failureSchema.parse(body);

        // Encontra o último log iniciado para este serviço
        const lastStartedLog = await prisma.syncLog.findFirst({
            where: {
                service: "GOOGLE_DRIVE_SYNC",
                status: "STARTED",
            },
            orderBy: {
                startedAt: 'desc',
            },
        });

        if (lastStartedLog) {
            await prisma.syncLog.update({
                where: { id: lastStartedLog.id },
                data: {
                    status: "FAILED",
                    details: details || "Ocorreu um erro durante o processamento dos arquivos.",
                    finishedAt: new Date(),
                },
            });
        }

        return NextResponse.json({ message: "Log de falha registado." });

    } catch (error) {
        console.error("LOG FAILURE API: Erro ao registar falha.", error);
         if (error instanceof z.ZodError) {
            return NextResponse.json({ message: "Dados inválidos.", issues: error.issues }, { status: 400 });
        }
        return NextResponse.json(
            { message: "Erro ao registar log de falha." },
            { status: 500 }
        );
    }
}
