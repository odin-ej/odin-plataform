import { z } from "zod";
import { User, Role, RegistrationRequest, UserRoleHistory } from "@prisma/client";

const baseMemberSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento obrigatória"),
  email: z.string().email("E-mail pessoal inválido"),
  emailEJ: z.string().email("E-mail EJ inválido"),
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
  confPassword: z.string().min(8, "Confirmação obrigatória"),
  phone: z.string().min(10, "Telefone inválido"),
  semesterEntryEj: z.string().min(1, "Campo obrigatório"),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  about: z.string().min(3, "Conte algo sobre você").optional(),
  course: z.string().min(3, "Conte algo sobre você"),
  roleId: z.string({ required_error: "Por favor, selecione um cargo." }),
  roles: z.array(z.string()).optional(),
  image: z
    .custom<File>((file) => file instanceof File && file.size > 0, {
      message: "Imagem obrigatória",
    })
    .refine((file) => file.size < 5 * 1024 * 1024, {
      message: "Máximo 5MB",
    })
    .refine((file) => ["image/jpeg", "image/png"].includes(file.type), {
      message: "Apenas JPG ou PNG",
    }),
});

// Schema com validação de senhas (para cadastro)
export const memberSchema = baseMemberSchema.refine(
  (data) => data.password === data.confPassword,
  {
    path: ["confPassword"],
    message: "Senhas não coincidem",
  }
);

// Schema para edição de perfil
export const userProfileSchema = baseMemberSchema
  .omit({
    image: true,
    roleId: true,
  })
  .extend({
    id: z.string(),
    imageUrl: z.string().url().optional(),
    password: z.string().optional(),
    confPassword: z.string().optional(),
    image: z
      .any()
      .optional()
      .refine(
        (file) => {
          if (!file || typeof file === "string") return true; // se for string (url antiga), ok
          if (!(file instanceof File)) return false;
          return file.size < 5 * 1024 * 1024;
        },
        { message: "Máximo 5MB" }
      )
      .refine(
        (file) => {
          if (!file || typeof file === "string") return true;
          if (!(file instanceof File)) return false;
          return ["image/jpeg", "image/jpg", "image/png"].includes(file.type);
        },
        { message: "Apenas JPG ou PNG" }
      ),
    aboutEj: z.string().optional(),
    roles: z
      .array(z.string())
      .nonempty("Selecione pelo menos um cargo")
      .optional(),
    roleId: z.string().optional(),
    otherRole: z.string().optional(),
    semesterLeaveEj: z.string().optional(),
    isExMember: z.enum(["Sim", "Não"]).optional(),
    alumniDreamer: z.enum(["Sim", "Não"]).optional(),
    isWorking: z.enum(["Sim", "Não"]).optional(),
    workplace: z.string().optional(),
    professionalInterests: z.array(z.string()).optional(),
    roleHistory: z
      .array(
        z.object({
          roleId: z.string().min(1, "Selecione um cargo."),
          semester: z
            .string()
            .regex(/^\d{4}\.[12]$/, "Use o formato AAAA.S (ex: 2025.1)"),
        })
      )
      .optional(),
  });

export type memberType = z.infer<typeof memberSchema>;
export type UserProfileValues = z.infer<typeof userProfileSchema>;
export type MemberWithRoles = User & { roles: Role[] };
export type MemberWithFullRoles = User & { roles: Role[]; currentRole: Role; roleHistory: (UserRoleHistory & { role: { name: string } })[] };
export type RegistrationRequestWithRoles = RegistrationRequest & {
  roles: Role[];
};
export type UniversalMember =
  | MemberWithFullRoles
  | RegistrationRequestWithRoles;
