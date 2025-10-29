import { z } from "zod";



// Parte 1: Schema base cru, agora com imageUrl
const baseProfileSchema = z.object({
  name: z.string().min(3, "Nome completo é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  email: z.string().email("E-mail pessoal inválido"),
  emailEJ: z.string().email("E-mail institucional inválido"),
  phone: z
    .string()
    .regex(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, "Telefone inválido"),
  course: z.string().min(1, "Curso é obrigatório"),
  semesterEntryEj: z.string().regex(/^\d{4}\.[12]$/, "Use o formato AAAA.S (ex: 2025.1)").min(1, "Semestre de entrada é obrigatório"),
  about: z.string().optional(),
  image: z.any().optional(), // Para upload
  imageUrl: z.string().url().optional().or(z.literal("")),
  linkedin: z
    .string()
    .url({ message: "Por favor, insira uma URL válida." })
    .optional()
    .or(z.literal("")),
  instagram: z.string().optional(),
  professionalInterests: z.array(z.string()).optional(),
  roleHistory: z
    .array(
      z.object({
        roleId: z.string().min(1, "Selecione um cargo."),
        semester: z
          .string()
          .regex(/^\d{4}\.[12]$/, "Use o formato AAAA.S (ex: 2025.1)"),
        managementReport: z.any().optional().nullable(),
      })
    )
    .optional(),

  password: z.string().optional().or(z.literal("")),
  confPassword: z.string().optional().or(z.literal("")),
});

// Schema para Membros Ativos
export const memberUpdateSchema = baseProfileSchema.extend({
  currentRoleId: z.string().min(1, "O cargo atual é obrigatório"),
});

// Schema para Ex-Membros
export const exMemberUpdateSchema = baseProfileSchema
  .extend({
    semesterLeaveEj: z.string().regex(/^\d{4}\.[12]$/, "Use o formato AAAA.S (ex: 2025.1)").min(1, "Semestre de saída é obrigatório"),
    aboutEj: z.string().optional(),
    roles: z.array(z.string()).min(1, "Selecione pelo menos um cargo ocupado."),
    otherRole: z.string().optional(),
    alumniDreamer: z.enum(["Sim", "Não"]),
    isWorking: z.enum(["Sim", "Não"]),
    workplace: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.password &&
      data.password.length > 0 &&
      data.password !== data.confPassword
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confPassword"],
        message: "As senhas precisam coincidir",
      });
    }

    if (data.isWorking === "Sim" && !data.workplace) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["workplace"],
        message: "Por favor, especifique o local de trabalho.",
      });
    }

    if (
      data.roles.includes("Outro") &&
      (!data.otherRole || data.otherRole.trim().length < 2)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherRole"],
        message: "Por favor, especifique o cargo.",
      });
    }

    const hasOtherRole = data.roles?.includes(
      process.env.OTHER_ROLE_ID as string
    );
    const otherRoleFilled = data.otherRole && data.otherRole.trim() !== "";

    // CONDIÇÃO 1: Se "Outro" está selecionado, o campo `otherRole` DEVE ser preenchido.
    if (hasOtherRole && !otherRoleFilled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherRole"], // Campo que receberá o erro
        message:
          "O campo 'Outro Cargo' é obrigatório quando o cargo 'Outro' é selecionado.",
      });
    }

    // CONDIÇÃO 2: Se o campo `otherRole` está preenchido, o cargo "Outro" DEVE estar selecionado.
    if (otherRoleFilled && !hasOtherRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherRole"],
        message:
          "O campo 'Outro Cargo' só pode ser preenchido se a opção 'Outro' estiver selecionada nos cargos.",
      });
    }
  });

export type MemberUpdateType = z.infer<typeof memberUpdateSchema>;
export type ExMemberUpdateType = z.infer<typeof exMemberUpdateSchema>;
