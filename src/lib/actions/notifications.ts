// lib/actions/notifications.ts
"use server";

import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NotificationType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

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
