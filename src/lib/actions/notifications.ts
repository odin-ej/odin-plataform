// lib/actions/notifications.ts
"use server";

import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NotificationType, NotificationPriority, NotificationScope, AreaRoles, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  createManagedNotificationSchema,
  CreateManagedNotificationValues,
  ManagedNotification,
  ManagedNotificationDetail,
} from "@/lib/schemas/notificationSchema";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { sesClient } from "@/lib/aws";
import { notificationEmailCommand } from "@/lib/email";

// Tipo para a notificação completa (NotificationUser + Notification)
export type FullNotification = Prisma.NotificationUserGetPayload<{
  include: {
    notification: true;
  }
}>;

/**
 * Busca as 10 notificações mais recentes para o usuário logado.
 */
export async function getNotifications(limit = 10): Promise<FullNotification[]> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Não autorizado");

    const notifications = await prisma.notificationUser.findMany({
      where: { userId: authUser.id },
      orderBy: { notification: { createdAt: 'desc' } }, // Ordena pela data de criação da notificação
      take: limit,
      include: {
        notification: true // Pega a mensagem, link, tipo, etc.
      }
    });
    return notifications;
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return []; // Retorna array vazio em caso de erro
  }
}

/**
 * Marca todas as notificações NÃO LIDAS do usuário atual como LIDAS.
 */
export async function markNotificationsAsRead(): Promise<{ success: boolean }> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Não autorizado");

    // Encontra as notificações não lidas
    const unread = await prisma.notificationUser.findMany({
      where: {
        userId: authUser.id,
        isRead: false
      },
      select: { id: true }
    });

    // Se não houver, não faz nada
    if (unread.length === 0) {
      return { success: true };
    }

    // Atualiza apenas as não lidas
    await prisma.notificationUser.updateMany({
      where: {
        id: { in: unread.map(n => n.id) }
      },
      data: {
        isRead: true
      }
    });

    revalidatePath("/comunidade"); // Revalida o layout (onde o painel está)
    return { success: true };

  } catch (error) {
    console.error("Erro ao marcar notificações como lidas:", error);
    return { success: false };
  }
}

type NotificationData = {
  type: NotificationType;
  description: string;
  link: string;
  targetUserId?: string;
  targetUsersIds?: string[];
};

export async function createNotification(data: NotificationData) {
 try {
   const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  if (data.targetUserId) {
    await prisma.notification.create({
      data: {
        type: data.type,
        notification: data.description,
        link: data.link,
        notificationUsers: {
          create: {
            userId: data.targetUserId,
          },
        },
      },
    });
  }
  if (data.targetUsersIds && data.targetUsersIds.length > 0) {
    const notificationsData = data.targetUsersIds.map((userId) => ({
      type: data.type,
      notification: data.description,
      link: data.link,
      notificationUsers: {
        create: {
          userId: userId,
        },
      },
    }));
    await prisma.notification.createMany({
      data: notificationsData,
    });
  }
 revalidatePath("/");
  return { success: true };
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    return {success: false}
  }

}

// ==========================================
// Server Actions para Gerenciamento de Notificações (Diretores)
// ==========================================

/**
 * Lista notificações criadas por diretores, com estatísticas de leitura.
 */
export async function getManagedNotifications(): Promise<ManagedNotification[]> {
  const authUser = await getAuthenticatedUser();
  if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
    return [];
  }

  const notifications = await prisma.notification.findMany({
    where: {
      createdById: { not: null },
    },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, imageUrl: true } },
      _count: { select: { notificationUsers: true } },
    },
  });

  // Para cada notificação, buscar o count de lidos
  const withReadCount = await Promise.all(
    notifications.map(async (n) => {
      const readCount = await prisma.notificationUser.count({
        where: { notificationId: n.id, isRead: true },
      });
      return { ...n, readCount };
    })
  );

  return withReadCount;
}

/**
 * Busca detalhes de uma notificação gerenciada, incluindo lista de quem leu.
 */
export async function getManagedNotificationById(
  id: string
): Promise<ManagedNotificationDetail | null> {
  const authUser = await getAuthenticatedUser();
  if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
    return null;
  }

  return prisma.notification.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, imageUrl: true } },
      notificationUsers: {
        include: {
          user: { select: { id: true, name: true, imageUrl: true, emailEJ: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Cria uma notificação gerenciada com escopo (USER, ROLE, AREA, ALL).
 * Resolve os destinatários e cria NotificationUser em batch.
 */
export async function createManagedNotification(
  data: CreateManagedNotificationValues
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return { success: false, error: "Não autorizado" };
    }

    const parsed = createManagedNotificationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos" };
    }

    const { title, description, scope, priority, targetUserIds, targetRoleId, targetArea, scheduledFor, link } = parsed.data;

    // Resolver destinatários com base no escopo
    let userIds: string[] = [];

    switch (scope) {
      case "USER":
        userIds = targetUserIds || [];
        break;
      case "ROLE":
        if (targetRoleId) {
          const usersWithRole = await prisma.user.findMany({
            where: { currentRoleId: targetRoleId, isExMember: false },
            select: { id: true },
          });
          userIds = usersWithRole.map((u) => u.id);
        }
        break;
      case "AREA":
        if (targetArea) {
          const usersInArea = await prisma.user.findMany({
            where: {
              isExMember: false,
              currentRole: { area: { has: targetArea } },
            },
            select: { id: true },
          });
          userIds = usersInArea.map((u) => u.id);
        }
        break;
      case "ALL":
        const allUsers = await prisma.user.findMany({
          where: { isExMember: false },
          select: { id: true },
        });
        userIds = allUsers.map((u) => u.id);
        break;
    }

    if (userIds.length === 0) {
      return { success: false, error: "Nenhum destinatário encontrado para o escopo selecionado" };
    }

    const isScheduledForFuture = scheduledFor && new Date(scheduledFor) > new Date();

    // Buscar dados dos usuários para enviar emails
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, emailEJ: true },
    });

    // Criar notificação e vincular aos destinatários em uma transação
    await prisma.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          notification: description,
          type: "GENERAL_ALERT",
          link: link || "/",
          title,
          scope: scope as NotificationScope,
          priority: priority as NotificationPriority,
          createdById: authUser.id,
          targetRoleId: scope === "ROLE" ? targetRoleId : null,
          targetArea: scope === "AREA" ? (targetArea as AreaRoles) : null,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          isSent: !isScheduledForFuture,
          isEvent: priority === "EVENT",
        },
      });

      // Criar NotificationUser em batch
      await tx.notificationUser.createMany({
        data: userIds.map((userId) => ({
          userId,
          notificationId: notification.id,
        })),
      });
    });

    // Enviar emails via SES se for envio imediato (não agendado)
    if (!isScheduledForFuture) {
      const emailPromises = targetUsers.map(async (user) => {
        try {
          const command = notificationEmailCommand({
            email: user.emailEJ,
            name: user.name,
            title,
            message: description,
            priority: (priority || "NORMAL") as "NORMAL" | "IMPORTANT" | "EVENT",
            link,
          });
          await sesClient.send(command);
        } catch (emailError) {
          console.error(`Erro ao enviar email para ${user.emailEJ}:`, emailError);
        }
      });
      // Enviar em paralelo, sem bloquear o retorno se algum falhar
      await Promise.allSettled(emailPromises);
    }

    revalidatePath("/");
    revalidatePath("/gerenciar-notificacoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar notificação gerenciada:", error);
    return { success: false, error: "Erro interno ao criar notificação" };
  }
}

/**
 * Deleta uma notificação gerenciada e todos os registros associados.
 */
export async function deleteManagedNotification(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return { success: false, error: "Não autorizado" };
    }

    // Verificar se a notificação existe e foi criada por um diretor
    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!notification || !notification.createdById) {
      return { success: false, error: "Notificação não encontrada" };
    }

    // Deletar (cascade vai remover NotificationUser)
    await prisma.notification.delete({ where: { id } });

    revalidatePath("/gerenciar-notificacoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar notificação:", error);
    return { success: false, error: "Erro interno ao deletar notificação" };
  }
}

/**
 * Busca notificações do tipo EVENT não lidas para o usuário autenticado (para o banner).
 */
export async function getEventNotifications() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return [];

    const events = await prisma.notificationUser.findMany({
      where: {
        userId: authUser.id,
        isRead: false,
        notification: {
          isEvent: true,
          isSent: true,
        },
      },
      include: {
        notification: {
          select: {
            id: true,
            title: true,
            notification: true,
            link: true,
            priority: true,
            createdAt: true,
          },
        },
      },
      orderBy: { notification: { createdAt: "desc" } },
    });

    return events;
  } catch (error) {
    console.error("Erro ao buscar notificações de evento:", error);
    return [];
  }
}

/**
 * Processa notificações agendadas cuja data já passou.
 * Marca como enviadas e envia emails via SES.
 */
export async function sendScheduledNotifications(): Promise<{
  success: boolean;
  sent: number;
  error?: string;
}> {
  try {
    // Buscar notificações agendadas que já deveriam ter sido enviadas
    const pendingNotifications = await prisma.notification.findMany({
      where: {
        isSent: false,
        scheduledFor: { lte: new Date() },
        createdById: { not: null },
      },
      include: {
        notificationUsers: {
          include: {
            user: { select: { id: true, name: true, emailEJ: true } },
          },
        },
      },
    });

    if (pendingNotifications.length === 0) {
      return { success: true, sent: 0 };
    }

    let totalSent = 0;

    for (const notification of pendingNotifications) {
      // Marcar como enviada
      await prisma.notification.update({
        where: { id: notification.id },
        data: { isSent: true },
      });

      // Enviar emails para todos os destinatários
      const emailPromises = notification.notificationUsers.map(async (nu) => {
        try {
          const command = notificationEmailCommand({
            email: nu.user.emailEJ,
            name: nu.user.name,
            title: notification.title || "Notificação",
            message: notification.notification,
            priority: (notification.priority || "NORMAL") as "NORMAL" | "IMPORTANT" | "EVENT",
            link: notification.link,
          });
          await sesClient.send(command);
        } catch (emailError) {
          console.error(`Erro ao enviar email agendado para ${nu.user.emailEJ}:`, emailError);
        }
      });

      await Promise.allSettled(emailPromises);
      totalSent++;
    }

    return { success: true, sent: totalSent };
  } catch (error) {
    console.error("Erro ao processar notificações agendadas:", error);
    return { success: false, sent: 0, error: "Erro interno ao processar notificações agendadas" };
  }
}

/**
 * Dispensa (marca como lida) uma notificação de evento específica.
 */
export async function dismissEventNotification(
  notificationUserId: string
): Promise<{ success: boolean }> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return { success: false };

    await prisma.notificationUser.update({
      where: {
        id: notificationUserId,
        userId: authUser.id, // Garante que só o próprio usuário pode dispensar
      },
      data: { isRead: true },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao dispensar notificação:", error);
    return { success: false };
  }
}
