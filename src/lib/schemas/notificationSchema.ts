import { z } from "zod";
import { AreaRoles, NotificationPriority, NotificationScope } from "@prisma/client";
import { Prisma } from "@prisma/client";

// Schema base sem refine/transform - usado para o formulário (useForm)
const baseNotificationSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres"),
  scope: z.nativeEnum(NotificationScope),
  priority: z.nativeEnum(NotificationPriority),
  targetUserIds: z.array(z.string()).optional(),
  targetRoleId: z.string().optional(),
  targetArea: z.nativeEnum(AreaRoles).optional(),
  scheduledFor: z.string().optional(),
  link: z.string().optional(),
});

// Tipo para o formulário (useForm<NotificationFormValues>)
export type NotificationFormValues = z.infer<typeof baseNotificationSchema>;

// Schema completo com validação - usado no server action
export const createManagedNotificationSchema = baseNotificationSchema.refine(
  (data) => {
    if (data.scope === "USER") return data.targetUserIds && data.targetUserIds.length > 0;
    if (data.scope === "ROLE") return !!data.targetRoleId;
    if (data.scope === "AREA") return !!data.targetArea;
    return true;
  },
  { message: "Dados de destinatário obrigatórios para o escopo selecionado" }
);

export type CreateManagedNotificationValues = z.infer<typeof createManagedNotificationSchema>;

// Schema base exportado para o resolver do formulário
export { baseNotificationSchema };

// Type for managed notification with stats
export type ManagedNotification = Prisma.NotificationGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; imageUrl: true } };
    _count: { select: { notificationUsers: true } };
  };
}> & {
  readCount: number;
};

// Type for managed notification detail with user list
export type ManagedNotificationDetail = Prisma.NotificationGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; imageUrl: true } };
    notificationUsers: {
      include: {
        user: { select: { id: true; name: true; imageUrl: true; emailEJ: true } };
      };
    };
  };
}>;
