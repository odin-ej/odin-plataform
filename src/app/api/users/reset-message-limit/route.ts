// Crie este arquivo em: <seu-projeto>/app/api/users/reset-message-limit/route.ts (ou pages/api/users/reset-message-limit.ts)

// api/users/reset-message-limit/route.ts

import { prisma } from '@/db';
import { NextResponse } from 'next/server';

// Inicializa o cliente Prisma.
// É uma boa prática inicializar fora do handler para reuso em 'cold starts'
// mas o .disconnect() garante que não haja muitas conexões abertas.


export async function GET(request: Request) {
    console.log('Início da execução da API Route para resetar limite de mensagens.');

    try {
        // 1. Segurança: Protege a rota com um "segredo".
        // Isso impede que qualquer pessoa execute esta função, exceto o seu serviço de Cron.
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
          return NextResponse.json({ message: 'Acesso não autorizado.' }, { status: 401 });
        }
        await prisma.$connect();
        // 2. Atualiza o campo 'dailyMessageCount' para 0 para todos os usuários.
        const updateResult = await prisma.user.updateMany({
            data: {
                dailyMessageCount: 0,
                lastMessageDate: new Date(), // Opcional: registrar a data da última redefinição
            },
        });

        console.log(`Sucesso! ${updateResult.count} usuários tiveram seu limite de mensagens diário resetado.`);
        return NextResponse.json({
            message: `Sucesso! ${updateResult.count} usuários tiveram seu limite de mensagens diário resetado.`,
        });

    } catch (error) {
        console.error("Erro na API Route de reset de limite de mensagens:", error);
        return NextResponse.json({ message: "Erro interno do servidor ao resetar limite de mensagens." }, { status: 500 });
    } 
}