import z from "zod";
import {
  TaskStatus,
  AccountType,
  ProjectStatus,
  Task,
  Project,
  User,
} from "@prisma/client";

export const taskCreateSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  description: z.string().min(10, "A descrição é obrigatória."),
  status: z.nativeEnum(TaskStatus, {
    required_error: "O status é obrigatório.",
  }),
  deadline: z.string().min(10, "A data de entrega é obrigatória."),
  responsibles: z
    .array(z.string())
    .min(1, "Selecione pelo menos um responsável."),
});

export const projectCreateSchema = z.object({
  account: z.nativeEnum(AccountType),
  description: z.string().min(6, "A descrição é obrigatória e deve ter no mínimo 6 letras."),
  title: z.string().min(3, "O título é obrigatório."),
  status: z.nativeEnum(ProjectStatus),
  deadline: z.date(),
  responsibles: z
    .array(z.string())
    .min(1, "Selecione pelo menos um responsável."),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(3, "O título é obrigatório.").optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  deadline: z.string().optional(),
  responsibles: z.array(z.string()).optional(), // Supondo que você passe IDs
});

export const projectUpdateSchema = z.object({
  account: z.nativeEnum(AccountType).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  deadline: z.date().optional(),
  responsibles: z.array(z.string()).optional(),
});

export type TaskFormValues = z.infer<typeof taskUpdateSchema>;
export type ProjectFormValues = z.infer<typeof projectUpdateSchema>;

export type TaskCreateFormValues = z.infer<typeof taskCreateSchema>;
export type ProjectCreateFormValues = z.infer<typeof projectCreateSchema>;

export type FullTask = Task & {
  responsibles: User[];
  project?: Project | null;
};
export type FullProject = Project & { responsibles: User[]; tasks: Task[] };
