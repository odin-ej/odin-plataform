/**
 * Kraken Action Executor
 *
 * Executes tool calls from Odin IA agent against real Prisma models.
 * Model names and enums match prisma/schema.prisma exactly.
 *
 * Models used:
 *   Room              { id, name }
 *   RoomReservation   { id, date: DateTime, title?, hourEnter: DateTime, hourLeave: DateTime, status: RoomStatus, roomId, userId, googleCalendarEventId? }
 *   RoomStatus        = FREE | BUSY | RESTRICTED
 *   ReservableItem    { id, name, description, imageUrl?, status: ItemStatus, areas, reservations }
 *   ItemReservation   { id, title, startDate: DateTime, endDate: DateTime, itemId, userId }
 *   ItemStatus        = AVAILABLE | IN_USE | MAINTENANCE
 *   ReserveRequestToConections { id, title, date: DateTime, description, applicantId, roleId, status: RequestStatus }
 *   RequestStatus     = PENDING | REQUESTED | APPROVED | REJECTED
 *   Task              { id, title, description, status: TaskStatus, deadline: DateTime, authorId, responsibles: User[] }
 *   TaskStatus        = PENDING | IN_PROGRESS | COMPLETED | CANCELED
 *   EstrategyPlan     { id: Int, propose, mission, vision, values: Value[], estrategyObjectives: EstrategyObjective[] }
 *   EstrategyObjective { id, objective, description, goals: Goal[] }
 *   Goal              { id, title, description, goal: Decimal, value: Decimal }
 *   Value             { id, name, description, isMotherValue }
 *   Notification      { id, title, message, type, link, users: NotificationUser[] }
 */

import { prisma } from "@/db";
import { getGoogleAuthToken } from "@/lib/google-auth";

interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message: string;
}

interface ActionContext {
  userId: string;
  userName: string;
}

export async function executeAction(
  toolName: string,
  input: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    switch (toolName) {
      // ─── Room Reservations ───
      case "listar_salas_disponiveis":
        return await listAvailableRooms(input as { date: string; startTime?: string; endTime?: string });
      case "criar_reserva_sala":
        return await createRoomReservation(input as {
          roomName: string; date: string; startTime: string; endTime: string; title?: string; reason?: string;
        }, context);
      case "cancelar_reserva":
        return await cancelReservation(input as { reservationId: string }, context);

      // ─── Tasks ───
      case "criar_tarefa":
        return await createTask(input as {
          title: string; description?: string; deadline?: string; assignees?: string;
        }, context);
      case "listar_minhas_tarefas":
        return await listMyTasks(context);

      // ─── Recognitions ───
      case "criar_reconhecimento":
        return await createRecognition(input as {
          recipientName: string; description: string; date?: string;
        }, context);

      // ─── Strategy ───
      case "consultar_estrategia":
        return await getStrategy();
      case "atualizar_meta":
        return await updateGoal(input as { goalName: string; newValue: string; reason?: string });

      // ─── JR Points ───
      case "solicitar_jr_points":
        return await requestJrPoints(input as {
          actionType: string; description: string; points?: number;
        }, context);

      // ─── Notifications ───
      case "enviar_notificacao":
        return await sendNotification(input as {
          recipientNames: string; title: string; message: string;
        }, context);

      default:
        return { success: false, error: "unknown_tool", message: `Ação "${toolName}" não reconhecida.` };
    }
  } catch (err) {
    console.error(`[Kraken Action] ${toolName} error:`, err);
    return {
      success: false,
      error: "execution_error",
      message: `Erro ao executar a ação: ${(err as Error).message}`,
    };
  }
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function fmtTime(d: Date | string): string {
  if (d instanceof Date) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return String(d);
}

function fmtDate(d: Date | string): string {
  if (d instanceof Date) return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return String(d);
}

/** Parse "amanhã", "hoje", or YYYY-MM-DD into a date string */
function parseDateInput(raw: string): string {
  const lower = raw.toLowerCase().trim();
  const now = new Date();
  if (lower.includes("amanhã") || lower.includes("amanha") || lower === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }
  if (lower.includes("hoje") || lower === "today") {
    return now.toISOString().split("T")[0];
  }
  // Already a date string like 2025-07-24
  if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) return lower;
  // DD/MM/YYYY
  const brMatch = lower.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  // Fallback: try to parse
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return raw;
}

// ════════════════════════════════════════════════════════════
// ROOM RESERVATIONS  (model: Room + RoomReservation)
// RoomStatus = FREE | BUSY | RESTRICTED
// ════════════════════════════════════════════════════════════

async function listAvailableRooms(input: { date: string; startTime?: string; endTime?: string }): Promise<ActionResult> {
  const dateStr = parseDateInput(input.date);
  const dayStart = new Date(dateStr + "T00:00:00-03:00");
  const dayEnd = new Date(dateStr + "T23:59:59-03:00");

  const rooms = await prisma.room.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (rooms.length === 0) {
    return { success: true, data: [], message: "Não há salas cadastradas no sistema." };
  }

  const reservations = await prisma.roomReservation.findMany({
    where: { date: { gte: dayStart, lte: dayEnd } },
    include: { room: { select: { id: true, name: true } }, user: { select: { name: true } } },
    orderBy: { hourEnter: "asc" },
  });

  const roomInfo = rooms.map((r) => {
    const rr = reservations.filter((res) => res.roomId === r.id);
    const busy = rr.map((res) =>
      `  → ${fmtTime(res.hourEnter)}–${fmtTime(res.hourLeave)}: "${res.title || "Sem título"}" (${res.user?.name || "?"})`
    ).join("\n");
    return `• **${r.name}**${busy ? `\n${busy}` : " — ✅ Livre o dia todo"}`;
  });

  // Also list reservable items
  const items = await prisma.reservableItem.findMany({
    where: { status: "AVAILABLE" },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });

  let itemInfo = "";
  if (items.length > 0) {
    const itemReservations = await prisma.itemReservation.findMany({
      where: { startDate: { lte: dayEnd }, endDate: { gte: dayStart } },
      include: { item: { select: { id: true, name: true } }, user: { select: { name: true } } },
    });
    itemInfo = "\n\n**Itens reserváveis:**\n" + items.map((it) => {
      const ir = itemReservations.filter((r) => r.itemId === it.id);
      const busy = ir.map((r) =>
        `  → ${fmtTime(r.startDate)}–${fmtTime(r.endDate)}: "${r.title}" (${r.user?.name || "?"})`
      ).join("\n");
      return `• **${it.name}**${it.description ? ` — ${it.description.slice(0, 60)}` : ""}${busy ? `\n${busy}` : " — ✅ Disponível"}`;
    }).join("\n");
  }

  return {
    success: true,
    data: { rooms, reservations },
    message: `**Salas em ${dateStr}:**\n\n${roomInfo.join("\n\n")}${itemInfo}`,
  };
}

async function createRoomReservation(
  input: { roomName: string; date: string; startTime: string; endTime: string; title?: string; reason?: string },
  context: ActionContext
): Promise<ActionResult> {
  const dateStr = parseDateInput(input.date);

  // Accept both "title" and "reason" fields (Claude may use either)
  const motivo = input.title || input.reason || "Reserva via Kraken";
  // Append "(via Kraken)" tag so users know it was AI-generated
  const reservationTitle = `${motivo} (via Kraken)`;

  // Find room by fuzzy name match
  const rooms = await prisma.room.findMany({ select: { id: true, name: true } });
  const nameLower = input.roomName.toLowerCase();
  const room = rooms.find((r) => r.name.toLowerCase().includes(nameLower))
    || rooms.find((r) => nameLower.includes(r.name.toLowerCase()));

  if (!room) {
    const list = rooms.map((r) => `• ${r.name}`).join("\n");
    return {
      success: false,
      error: "room_not_found",
      message: `Não encontrei uma sala chamada "${input.roomName}". Salas disponíveis:\n${list}`,
    };
  }

  // Build DateTime objects (São Paulo timezone)
  const dateObj = new Date(dateStr + "T00:00:00-03:00");
  const hourEnterObj = new Date(dateStr + "T" + input.startTime + ":00-03:00");
  const hourLeaveObj = new Date(dateStr + "T" + input.endTime + ":00-03:00");

  // Check conflicts — only check time overlap, ignore status field
  const conflicts = await prisma.roomReservation.findMany({
    where: {
      roomId: room.id,
      date: { gte: new Date(dateStr + "T00:00:00-03:00"), lte: new Date(dateStr + "T23:59:59-03:00") },
      AND: [
        { hourEnter: { lt: hourLeaveObj } },
        { hourLeave: { gt: hourEnterObj } },
      ],
    },
    include: { user: { select: { name: true } } },
  });

  if (conflicts.length > 0) {
    const cl = conflicts.map((c) =>
      `• ${fmtTime(c.hourEnter)}–${fmtTime(c.hourLeave)}: "${c.title || "Sem título"}" (${c.user?.name || "?"})`
    ).join("\n");
    return {
      success: false,
      error: "conflict",
      message: `A sala **${room.name}** já está reservada:\n${cl}\n\nEscolha outro horário ou outra sala.`,
    };
  }

  // 1. Create Google Calendar event first (same as manual reservation flow)
  let googleCalendarEventId: string | null = null;
  try {
    const googleToken = await getGoogleAuthToken();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (googleToken && calendarId) {
      const googleRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${googleToken}`,
          },
          body: JSON.stringify({
            summary: `Reserva da sala ${room.name}`,
            description: `Reservado por: ${context.userName}: ${motivo} (via Kraken)`,
            start: {
              dateTime: hourEnterObj.toISOString(),
              timeZone: "America/Sao_Paulo",
            },
            end: {
              dateTime: hourLeaveObj.toISOString(),
              timeZone: "America/Sao_Paulo",
            },
          }),
        }
      );

      if (googleRes.ok) {
        const googleData = await googleRes.json();
        googleCalendarEventId = googleData.id;
      } else {
        console.warn("[Kraken] Google Calendar sync failed, creating reservation without it");
      }
    }
  } catch (err) {
    console.warn("[Kraken] Google Calendar error (non-blocking):", (err as Error).message);
  }

  // 2. Create reservation in DB — userId is the REAL user who asked
  const reservation = await prisma.roomReservation.create({
    data: {
      title: reservationTitle,
      date: dateObj,
      hourEnter: hourEnterObj,
      hourLeave: hourLeaveObj,
      roomId: room.id,
      userId: context.userId,
      status: "BUSY" as const,
      ...(googleCalendarEventId && { googleCalendarEventId }),
    },
  });

  const calendarNote = googleCalendarEventId
    ? "\n• 📅 *Sincronizado com Google Calendar*"
    : "\n• ⚠️ *Google Calendar não sincronizado (evento criado apenas na plataforma)*";

  return {
    success: true,
    data: reservation,
    message: `✅ **Reserva criada com sucesso!**\n\n• **Sala:** ${room.name}\n• **Data:** ${dateStr}\n• **Horário:** ${input.startTime} às ${input.endTime}\n• **Motivo:** ${motivo}\n• **Reservado por:** ${context.userName}${calendarNote}\n• 🤖 *Criado via Kraken*`,
  };
}

async function cancelReservation(
  input: { reservationId: string },
  context: ActionContext
): Promise<ActionResult> {
  const reservation = await prisma.roomReservation.findUnique({
    where: { id: input.reservationId },
    include: { room: { select: { name: true } } },
  });

  if (!reservation) {
    return { success: false, error: "not_found", message: "Reserva não encontrada." };
  }

  if (reservation.userId !== context.userId) {
    return { success: false, error: "forbidden", message: "Você só pode cancelar suas próprias reservas." };
  }

  // Delete Google Calendar event if exists
  if (reservation.googleCalendarEventId) {
    try {
      const googleToken = await getGoogleAuthToken();
      const calendarId = process.env.GOOGLE_CALENDAR_ID;
      if (googleToken && calendarId) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${reservation.googleCalendarEventId}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${googleToken}` } }
        );
      }
    } catch (err) {
      console.warn("[Kraken] Failed to delete Google Calendar event:", (err as Error).message);
    }
  }

  await prisma.roomReservation.delete({ where: { id: input.reservationId } });

  return {
    success: true,
    message: `✅ Reserva cancelada!\n• **Sala:** ${reservation.room.name}\n• **Data:** ${fmtDate(reservation.date)}\n• **Horário:** ${fmtTime(reservation.hourEnter)}–${fmtTime(reservation.hourLeave)}${reservation.googleCalendarEventId ? "\n• 📅 *Removido do Google Calendar*" : ""}`,
  };
}

// ════════════════════════════════════════════════════════════
// TASKS  (model: Task, TaskStatus = PENDING | IN_PROGRESS | COMPLETED | CANCELED)
// ════════════════════════════════════════════════════════════

async function createTask(
  input: { title: string; description?: string; deadline?: string; assignees?: string },
  context: ActionContext
): Promise<ActionResult> {
  let responsibleIds: string[] = [context.userId];

  if (input.assignees) {
    const names = input.assignees.split(",").map((n) => n.trim()).filter(Boolean);
    if (names.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          OR: names.map((name) => ({ name: { contains: name, mode: "insensitive" as const } })),
          isExMember: false,
        },
        select: { id: true, name: true },
      });
      if (users.length > 0) responsibleIds = users.map((u) => u.id);
    }
  }

  const deadlineStr = input.deadline ? parseDateInput(input.deadline) : undefined;

  const task = await prisma.task.create({
    data: {
      title: `${input.title} (via Kraken)`,
      description: input.description || "Criado via Kraken IA",
      status: "PENDING",
      deadline: deadlineStr ? new Date(deadlineStr + "T23:59:59-03:00") : new Date(Date.now() + 7 * 86400000),
      authorId: context.userId,
      responsibles: { connect: responsibleIds.map((id) => ({ id })) },
    },
  });

  return {
    success: true,
    data: task,
    message: `✅ **Tarefa criada!**\n• **Título:** ${input.title}\n• **Prazo:** ${deadlineStr || "7 dias"}\n• **Status:** Pendente`,
  };
}

async function listMyTasks(context: ActionContext): Promise<ActionResult> {
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { authorId: context.userId },
        { responsibles: { some: { id: context.userId } } },
      ],
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    select: { id: true, title: true, status: true, deadline: true },
    orderBy: { deadline: "asc" },
    take: 15,
  });

  if (tasks.length === 0) {
    return { success: true, data: [], message: "Você não tem tarefas pendentes! 🎉" };
  }

  const emoji: Record<string, string> = { PENDING: "🟡", IN_PROGRESS: "🔵" };
  const list = tasks.map((t) =>
    `${emoji[t.status] || "⚪"} **${t.title}** — prazo: ${t.deadline ? fmtDate(t.deadline) : "sem prazo"}`
  ).join("\n");

  return { success: true, data: tasks, message: `Suas tarefas (${tasks.length}):\n\n${list}` };
}

// ════════════════════════════════════════════════════════════
// RECOGNITIONS (creates notification)
// ════════════════════════════════════════════════════════════

async function createRecognition(
  input: { recipientName: string; description: string; date?: string },
  context: ActionContext
): Promise<ActionResult> {
  const recipient = await prisma.user.findFirst({
    where: { name: { contains: input.recipientName, mode: "insensitive" }},
    select: { id: true, name: true },
  });

  if (!recipient) {
    return { success: false, error: "user_not_found", message: `Não encontrei um membro chamado "${input.recipientName}".` };
  }

  await prisma.notification.create({
    data: {
      title: `Reconhecimento para ${recipient.name}`,
      notification: `${context.userName}: ${input.description}`,
      type: "GENERAL_ALERT",
      link: "/reconhecimentos",
      notificationUsers: { create: { userId: recipient.id } },
    },
  });

  return {
    success: true,
    message: `✅ **Reconhecimento registrado!**\n• **Para:** ${recipient.name}\n• **Descrição:** ${input.description}`,
  };
}

// ════════════════════════════════════════════════════════════
// STRATEGY  (EstrategyPlan, EstrategyObjective, Goal, Value)
// Note: the model is "EstrategyPlan" (not "StrategyPlan")
// Goal.goal and Goal.value are Decimal
// ════════════════════════════════════════════════════════════

async function getStrategy(): Promise<ActionResult> {
  const plan = await prisma.estrategyPlan.findFirst({
    include: {
      estrategyObjectives: { include: { goals: true } },
      values: true,
    },
  });

  if (!plan) {
    return { success: true, data: null, message: "Nenhum planejamento estratégico encontrado." };
  }

  let msg = `📊 **Estratégia da Empresa**\n\n`;
  if (plan.mission) msg += `**Missão:** ${plan.mission}\n`;
  if (plan.vision) msg += `**Visão:** ${plan.vision}\n`;
  if (plan.propose) msg += `**Propósito:** ${plan.propose}\n\n`;

  if (plan.values.length > 0) {
    msg += `**Valores:**\n${plan.values.map((v) => `• ${v.name}${v.description ? `: ${v.description}` : ""}`).join("\n")}\n\n`;
  }

  if (plan.estrategyObjectives.length > 0) {
    msg += `**Objetivos e Metas:**\n`;
    for (const obj of plan.estrategyObjectives) {
      msg += `\n🎯 **${obj.objective}**\n`;
      for (const goal of obj.goals) {
        const val = Number(goal.value);
        const target = Number(goal.goal);
        const pct = target > 0 ? Math.round((val / target) * 100) : 0;
        const bar = pct >= 100 ? "🟢" : pct >= 50 ? "🟡" : "🔴";
        msg += `  ${bar} ${goal.title}: ${val}/${target} (${pct}%)\n`;
      }
    }
  }

  return { success: true, data: plan, message: msg };
}

async function updateGoal(input: { goalName: string; newValue: string; reason?: string }): Promise<ActionResult> {
  const goal = await prisma.goal.findFirst({
    where: { title: { contains: input.goalName, mode: "insensitive" } },
  });

  if (!goal) {
    // List available goals
    const goals = await prisma.goal.findMany({ select: { title: true } });
    const list = goals.map((g) => `• ${g.title}`).join("\n");
    return { success: false, error: "not_found", message: `Meta "${input.goalName}" não encontrada. Metas disponíveis:\n${list}` };
  }

  const numValue = parseFloat(input.newValue);
  if (isNaN(numValue)) {
    return { success: false, error: "invalid_value", message: `"${input.newValue}" não é um número válido.` };
  }

  const updated = await prisma.goal.update({
    where: { id: goal.id },
    data: { goal: numValue },
  });

  return {
    success: true,
    data: updated,
    message: `✅ **Meta atualizada!**\n• **Meta:** ${updated.title}\n• **Novo alvo:** ${numValue}${input.reason ? `\n• **Motivo:** ${input.reason}` : ""}`,
  };
}

// ════════════════════════════════════════════════════════════
// JR POINTS (notification-based for now)
// ════════════════════════════════════════════════════════════

async function requestJrPoints(
  input: { actionType: string; description: string; points?: number },
  context: ActionContext
): Promise<ActionResult> {
  await prisma.notification.create({
    data: {
      title: `Solicitação JR Points: ${input.actionType}`,
      notification: `${context.userName} solicitou ${input.points ?? "?"} pontos: ${input.description}`,
      type: "GENERAL_ALERT",
      link: "/jr-points",
      notificationUsers: { create: { userId: context.userId } },
    },
  });

  return {
    success: true,
    message: `✅ **Solicitação registrada!**\n• **Tipo:** ${input.actionType}\n• **Descrição:** ${input.description}${input.points ? `\n• **Pontos:** ${input.points}` : ""}`,
  };
}

// ════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════════════════

async function sendNotification(
  input: { recipientNames: string; title: string; message: string },
  context: ActionContext
): Promise<ActionResult> {
  const names = input.recipientNames.split(",").map((n) => n.trim()).filter(Boolean);

  const users = await prisma.user.findMany({
    where: {
      OR: names.map((name) => ({ name: { contains: name, mode: "insensitive" as const } })),
      isExMember: false,
    },
    select: { id: true, name: true },
  });

  if (users.length === 0) {
    return { success: false, error: "no_users", message: `Não encontrei membros com esses nomes: ${names.join(", ")}` };
  }

  await prisma.notification.create({
    data: {
      title: input.title,
      notification: `De ${context.userName}: ${input.message}`,
      type: "GENERAL_ALERT",
      link: "/",
      notificationUsers: { create: users.map((u) => ({ userId: u.id })) },
    },
  });

  return {
    success: true,
    message: `✅ **Notificação enviada!**\n• **Para:** ${users.map((u) => u.name).join(", ")}\n• **Título:** ${input.title}`,
  };
}

