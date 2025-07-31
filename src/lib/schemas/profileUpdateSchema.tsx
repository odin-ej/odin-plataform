import { z } from "zod";

// Parte 1: Schema base cru, agora com imageUrl
const rawBaseSchema = z.object({
  name: z.string().min(3, "Nome completo é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  email: z.string().email("E-mail pessoal inválido"),
  emailEJ: z.string().email("E-mail institucional inválido"),
  semesterEntryEj: z.string().min(1, "Semestre de entrada é obrigatório"),
  course: z.string().min(1, "Curso é obrigatório"),
  phone: z
    .string()
    .regex(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, "Telefone inválido"),
  instagram: z
    .string()
    .optional(),
  linkedin: z
    .string()
    .optional(),
  about: z.string().min(10, "Descreva um pouco sobre você"),
  image: z.any().optional(),

  // CORREÇÃO: Adicionado o campo imageUrl para validação
  imageUrl: z
    .string()
    .url("URL da imagem inválida")
    .optional()
    .or(z.literal("")),
  isExMember: z.enum(["Sim", "Não"]),
  alumniDreamer: z.enum(["Sim", "Não"]),
  password: z
    .string()
    .min(8, "A senha deve ter no mínimo 8 caracteres.")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula.")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número.")
    .regex(
      /[^a-zA-Z0-9]/,
      "A senha deve conter pelo menos um caractere especial."
    )
    .optional()
    .or(z.literal("")),
  confPassword: z.string().optional().or(z.literal("")),
});

// Parte 2: Schemas específicos (sem alterações aqui)

export const memberUpdateSchema = rawBaseSchema
  .extend({
    roleId: z.string().optional(),
    roles: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password === data.confPassword;
      }
      return true;
    },
    {
      path: ["confPassword"],
      message: "As senhas precisam coincidir",
    }
  );

export const exMemberUpdateSchema = rawBaseSchema
  .extend({
    semesterLeaveEj: z.string().min(1, "Semestre de saída é obrigatório"),
    aboutEj: z.string().min(10, "Descreva um pouco da sua experiência na EJ"),
    roles: z.array(z.string()).nonempty("Selecione pelo menos um cargo"),
    otherRole: z.string().optional(),
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

    if (data.otherRole && !data.roles.includes("Outro")) {
      // Assumindo que 'Outro' é o valor/ID
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherRole"],
        message:
          "O campo 'Outro Cargo' só pode ser preenchido se a opção 'Outro' estiver selecionada nos cargos.",
      });
    }

    if ("roleId" in data) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roleId"],
        message: "Ex-membros não devem conter roleId.",
      });
    }
  });

export type MemberUpdateType = z.infer<typeof memberUpdateSchema>;
export type ExMemberUpdateType = z.infer<typeof exMemberUpdateSchema>;
