import z from "zod";
import { User, Tag, ActionType, TagAreas } from "@prisma/client";

export const actionTypeSchema = z.object({
  name: z.string().min(3, "O nome da ação é obrigatório."),
  description: z.string().min(10, "A descrição precisa de mais detalhes."),
});
export const tagSchema = z.object({
  description: z.string().min(5, "A descrição é obrigatória."),
  datePerformed: z.string().min(5, "A data de realização é obrigatória."),
  areas: z.array(z.nativeEnum(TagAreas)).min(1, "Selecione pelo menos uma área."),
  assignerId: z.string().optional(),
  value: z.string().min(1, "O valor é obrigatório."), // Permite qualquer número: positivo, negativo ou zero.
  actionTypeId: z.string({
    required_error: "É necessário selecionar um tipo de ação.",
  }),
});
export const addTagToUsersSchema = z.object({
  userIds: z.array(z.string()).min(1, "Selecione pelo menos um utilizador."),
  datePerformed: z.string().min(5, "A data de realização é obrigatória."),
  tagId: z.string({ required_error: "É necessário selecionar uma tag." }),
});
export type UserRankingInfo = User & { totalPoints: number; tagsCount: number };
export type TagWithAction = Tag & { actionType: { name: string } | null };
export type ActionTypeWithCount = ActionType & { _count: { tags: number } };
