import { z } from "zod";

// Schema para atualizar a Cultura (Missão, Visão, Propósito)
// Todos os campos são opcionais para uma operação PATCH
export const cultureUpdateSchema = z.object({
  mission: z.string().min(10, "A missão deve ter pelo menos 10 caracteres.").optional(),
  vision: z.string().min(10, "A visão deve ter pelo menos 10 caracteres.").optional(),
  propose: z.string().min(10, "O propósito deve ter pelo menos 10 caracteres.").optional(),
});

export type CultureUpdateType = z.infer<typeof cultureUpdateSchema>;


// Schema para atualizar um Valor
export const valueUpdateSchema = z.object({
  name: z.string().min(3, "O nome do valor é obrigatório.").optional(),
  description: z.string().min(10, "A descrição é obrigatória.").optional(),
  isMotherValue: z.boolean().optional(),
});

export type ValueUpdateType = z.infer<typeof valueUpdateSchema>;


// Schema para atualizar um Objetivo Estratégico
export const strategyObjectiveUpdateSchema = z.object({
  objective: z.string().min(5, "O objetivo deve ter pelo menos 5 caracteres.").optional(),
  description: z.string().min(10, "A descrição é obrigatória.").optional(),
});

export type StrategyObjectiveUpdateType = z.infer<typeof strategyObjectiveUpdateSchema>;


// Schema para atualizar uma Meta
export const goalUpdateSchema = z.object({
    title: z.string().min(3, "O título é obrigatório.").optional(),
    description: z.string().min(10, "A descrição é obrigatória.").optional(),
    goal: z.number().min(0, "O valor da meta não pode ser negativo.").optional(),
    value: z.number().min(0, "O valor atual não pode ser negativo.").optional(),
});

export type GoalUpdateType = z.infer<typeof goalUpdateSchema>;

