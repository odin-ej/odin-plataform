import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { sesClient } from "@/lib/aws"; // Supondo que você tenha um cliente SES configurado
import { completeProfileEmailCommand } from "@/lib/email";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { message: "Acesso não autorizado." },
      { status: 401 }
    );
  }
  await prisma.$connect();

  try {
    const threeDaysAgo = addDays(new Date(), -3);

    // 1. Encontra usuários com perfil incompleto que não foram notificados na última semana
    const usersToNotify = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { professionalInterests: { none: {} } }, // Se os interesses estiverem vazios
              { roleHistory: { none: {} } }, // Ou se o histórico de cargos estiver vazio
            ],
          },
          {
            OR: [
              { profileCompletionNotifiedAt: null }, // Se nunca foi notificado
              { profileCompletionNotifiedAt: { lt: threeDaysAgo } }, // Ou se a última notificação foi há mais de 7 dias
            ],
          },
        ],
      },
      select: { id: true, name: true, email: true },
    });

    if (usersToNotify.length === 0) {
      return NextResponse.json({
        message: "Nenhum usuário para notificar hoje.",
      });
    }

    // 2. Cria a notificação interna na plataforma
    const notification = await prisma.notification.create({
      data: {
        notification:
          "Seu perfil está quase completo! Adicione seus interesses e histórico para receber oportunidades personalizadas.",
        link: "/perfil",
        type: "GENERAL_ALERT",
      },
    });

    // Associa a notificação a todos os usuários encontrados
    await prisma.notificationUser.createMany({
      data: usersToNotify.map((user) => ({
        notificationId: notification.id,
        userId: user.id,
      })),
    });

    // 3. Envia os e-mails via Amazon SES
    const emailPromises = usersToNotify.map((user) =>
      sesClient.send(
        completeProfileEmailCommand({ email: user.email, name: user.name })
      )
    );
    await Promise.all(emailPromises);

    // 4. Atualiza a data da última notificação para evitar spam
    await prisma.user.updateMany({
      where: { id: { in: usersToNotify.map((u) => u.id) } },
      data: { profileCompletionNotifiedAt: new Date() },
    });

    return NextResponse.json({
      message: `${usersToNotify.length} usuários notificados com sucesso.`,
    });
  } catch (error) {
    console.error("[NOTIFY_INCOMPLETE_PROFILES_ERROR]", error);
    return NextResponse.json(
      { message: "Erro ao processar notificações." },
      { status: 500 }
    );
  }
}
