import { NextResponse } from "next/server";
import { sendScheduledNotifications } from "@/lib/actions/notifications";

/**
 * GET /api/notifications/send-scheduled
 *
 * Endpoint para ser chamado por um cron job (ex: Vercel Cron, AWS EventBridge, etc.)
 * Processa notificações agendadas cuja data já passou e envia emails via SES.
 *
 * Protegido por uma chave secreta via header Authorization.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const result = await sendScheduledNotifications();

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, sent: result.sent },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    sent: result.sent,
    message:
      result.sent > 0
        ? `${result.sent} notificação(ões) agendada(s) enviada(s) com sucesso`
        : "Nenhuma notificação agendada pendente",
  });
}
