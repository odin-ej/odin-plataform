import { z } from "zod";

export const exMemberSchema = z
  .object({
    name: z.string().min(3, "Nome completo é obrigatório"),
    birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
    email: z.string().email("E-mail pessoal inválido"),
    emailEJ: z.string().email("E-mail institucional inválido"),
    password: z
      .string()
      .min(8, "A senha deve ter no mínimo 8 caracteres.")
      .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula.")
      .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
      .regex(/[0-9]/, "A senha deve conter pelo menos um número.")
      .regex(
        /[^a-zA-Z0-9]/,
        "A senha deve conter pelo menos um caractere especial (ex: !@#$%)."
      ),
    confPassword: z.string(),
    semesterEntryEj: z.string().min(1, "Semestre de entrada é obrigatório"),
    semesterLeaveEj: z.string().min(1, "Semestre de saída é obrigatório"),
    course: z.string().min(1, "Curso é obrigatório"),
    phone: z
      .string()
      .regex(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, "Telefone inválido"),
    instagram: z
      .string()
      .optional()
      .or(z.literal("")),
    linkedin: z
      .string()
      .optional()
      .or(z.literal("")),
    about: z.string().min(10, "Descreva um pouco sobre você"),
    aboutEj: z.string().min(10, "Descreva um pouco da sua experiência na EJ"),
    roles: z.array(z.string()).nonempty("Selecione pelo menos um cargo"),
    otherRole: z.string().optional(),
    isExMember: z.enum(["Sim", "Não"]),
    alumniDreamer: z.enum(["Sim", "Não"], {
      errorMap: () => ({ message: "Selecione 'Sim' ou 'Não'" }),
    }),
    isWorking: z.enum(["Sim", "Não"], {
      errorMap: () => ({ message: "Selecione 'Sim' ou 'Não'" }),
    }),
    workplace: z.string().optional(),
    image: z.instanceof(File, { message: "É necessário enviar uma imagem" }),
  })
  .refine((data) => data.password === data.confPassword, {
    path: ["confPassword"],
    message: "As senhas precisam coincidir",
  })
  .superRefine((data, ctx) => {
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

    if (data.isWorking === "Sim" && !data.workplace) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["workplace"],
        message: "Por favor, especifique o local de trabalho.",
      });
    }
  });

export type ExMemberType = z.infer<typeof exMemberSchema>;
