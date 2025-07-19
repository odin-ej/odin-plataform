import { prisma } from "@/db";
import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: Request) {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await prisma.conversation.deleteMany({
            where: { createdAt: { lt: thirtyDaysAgo } },
        });

        const message = `${result.count} conversas antigas foram apagadas.`;

        return NextResponse.json({ message });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return NextResponse.json({ message: "Erro ao apagar conversas antigas." }, { status: 500 });
    }
}
