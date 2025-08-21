import z from "zod";
import { User, Tag, ActionType, TagAreas, Prisma } from "@prisma/client";

export const actionTypeSchema = z.object({
  name: z.string().min(3, "O nome da ação é obrigatório."),
  description: z.string().min(10, "A descrição precisa de mais detalhes."),
});
export const tagTemplateSchema = z
  .object({
    name: z.string().min(3, "O nome do modelo é obrigatório."),
    description: z.string().min(5, "A descrição é obrigatória."),
    baseValue: z.coerce.number({
      required_error: "O valor base é obrigatório.",
    }),
    actionTypeId: z.string({ required_error: "Selecione um tipo de ação." }),
    isScalable: z
      .boolean({
        required_error: "Informe se é escalonável ou não.",
      }),
    escalationValue: z.coerce.number().optional(),
    escalationStreakDays: z.coerce.number().optional(),
    escalationCondition: z.string().optional(),
    areas: z.array(z.nativeEnum(TagAreas))
  })
  .refine(
    (data) => {
      if (data.isScalable) {
        return (
          data.escalationValue != null && data.escalationStreakDays != null
        );
      }
      return true;
    },
    {
      message:
        "Valor de escalonamento e dias de streak são obrigatórios se a tag for escalonável.",
      path: ["isScalable"],
    }
  );

export type TagTemplateFormValues = z.infer<typeof tagTemplateSchema>;

export const addTagToUsersSchema = z.object({
  userIds: z.array(z.string()).min(1, "Selecione pelo menos um utilizador."),
  datePerformed: z.string().min(5, "A data de realização é obrigatória."),
  templateIds:  z.array(z.string()).min(1, "Selecione pelo menos uma tag."),
  description: z.string().optional(),
  attachments: z.array(z.any()).optional(),
});
export type UserRankingInfo = User & {
  totalPoints: number;
  tagsCount: number;
  tags: Tag[];
};

// Adicione este novo tipo para representar a empresa
export type EnterpriseInfo = {
  id: 'enterprise'; // ID fixo para fácil identificação
  name: string;
  totalPoints: number;
  tagsCount: number;
  imageUrl: string; // Caminho para o logo da empresa
};

export type TagTemplateWithAction = Prisma.TagTemplateGetPayload<{
  include: { actionType: true, jrPointsVersion: true  };
}>;
export type TagWithAction = Prisma.TagGetPayload<{
  include: { actionType: true, jrPointsVersion: true, assigner: true, template: true   };
}>;;
export type ActionTypeWithCount = ActionType & { _count: { tagTemplates: number } };

export const solicitationSchema = z.object({
  description: z.string().min(10, "A descrição precisa ter pelo menos 10 caracteres."),
  datePerformed: z.string().min(10, "A data é obrigatória."),
  tags: z.array(z.string()).optional(),
  membersSelected: z.array(z.string()),
  attachments: z.array(z.any()).optional(), // Adicionado
});

export const reportJRPointsSchema = z.object({
  description: z.string().min(10, "A descrição precisa ter pelo menos 10 caracteres."),
  tagId: z.string({ required_error: "É necessário selecionar uma tag." }),
  attachments: z.array(z.any()).optional(), // Adicionado
});

export type SolicitationFormData = z.infer<typeof solicitationSchema>;
export type ReportFormData = z.infer<typeof reportJRPointsSchema>;