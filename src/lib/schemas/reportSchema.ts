import { z } from "zod";
import { Prisma } from "@prisma/client";

export const reportSchema = z
  .object({
    title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
    content: z.string().min(20, "A descrição precisa de mais detalhes."),
    status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REVIEWED"]).optional(),
    // Um report deve ter ou um utilizador ou um cargo como destinatário, mas não ambos.
    recipientUserId: z.string().optional(),
    recipientRoleId: z.string().optional(),
    recipientNotes: z.string().optional(),
  })
  .refine((data) => data.recipientUserId || data.recipientRoleId, {
    message: "É necessário selecionar um destinatário (utilizador ou cargo).",
    path: ["recipientUserId"], // Mostra o erro no primeiro campo de destinatário
  });

export type ReportFormValues = z.infer<typeof reportSchema>;

// Tipo estendido para os dados da tabela
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const extendedReportPayload = Prisma.validator<Prisma.ReportDefaultArgs>()({
  include: {
    recipientUser: { select: { name: true } },
    recipientRole: { select: { name: true } },
  },
});

// O tipo ExtendedReport agora é gerado diretamente a partir do payload do Prisma.
// Se você adicionar mais relações no 'include' acima, este tipo será atualizado automaticamente.
export type ExtendedReport = Prisma.ReportGetPayload<
  typeof extendedReportPayload
>;
