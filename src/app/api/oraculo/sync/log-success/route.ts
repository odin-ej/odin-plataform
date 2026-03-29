import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { AppAction } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser || !await can(authUser, AppAction.MANAGE_AI_KNOWLEDGE)) {
            return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
        }

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
                    status: "SUCCESS",
                    finishedAt: new Date(),
                },
            });
        }

        return NextResponse.json({ message: "Log de sucesso registado." });

    } catch (error) {
        console.error("LOG SUCCESS API: Erro ao registar sucesso.", error);
        return NextResponse.json(
            { message: "Erro ao registar log de sucesso." },
            { status: 500 }
        );
    }
}
