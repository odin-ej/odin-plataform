import { z } from "zod";
import { Prisma, ReportCategory, ReportStatus } from "@prisma/client";

// ─── Schema base (sem refine) — usado para o formulário ──────────────

const baseReportSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  content: z.string().min(20, "A descrição precisa de mais detalhes."),
  category: z.nativeEnum(ReportCategory),
  isAnonymous: z.boolean(),
  status: z.nativeEnum(ReportStatus).optional(),
  recipientUserId: z.string().optional(),
  recipientRoleId: z.string().optional(),
  recipientNotes: z.string().optional(),
});

// Tipo para o formulário (useForm<ReportFormValues>)
export type ReportFormValues = z.infer<typeof baseReportSchema>;

// Schema base exportado para o resolver do formulário
export { baseReportSchema };

// Schema completo com validação — usado no server action
export const reportSchema = baseReportSchema.refine(
  (data) => data.recipientUserId || data.recipientRoleId,
  {
    message: "É necessário selecionar um destinatário (utilizador ou cargo).",
    path: ["recipientUserId"],
  }
);

// ─── Tipo estendido para listagem ────────────────────────────────────

export type ExtendedReport = Prisma.ReportGetPayload<{
  include: {
    referent: { select: { id: true; name: true; imageUrl: true } };
    recipientUser: { select: { id: true; name: true; imageUrl: true } };
    recipientRole: { select: { id: true; name: true } };
  };
}>;

// ─── Constantes de UI ────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<
  ReportCategory,
  { label: string; className: string }
> = {
  DENUNCIA: {
    label: "Denúncia",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  SUGESTAO: {
    label: "Sugestão",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  FEEDBACK: {
    label: "Feedback",
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  BUG: {
    label: "Bug",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  SOLICITACAO: {
    label: "Solicitação",
    className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
  OUTRO: {
    label: "Outro",
    className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  },
};

export const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Rascunho",
    className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  },
  SUBMITTED: {
    label: "Em análise",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  APPROVED: {
    label: "Concluído",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  REJECTED: {
    label: "Recusado",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};
