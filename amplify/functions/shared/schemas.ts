import z from "zod";
import {
  User,
  Tag,
  ActionType,
  Role,
  RegistrationRequest,
  TaskStatus,
  AccountType,
  ProjectStatus,
  Task,
  Project,
  Prisma,
  AreaRoles,
  RoomReservation,
  RoomStatus,
} from ".prisma/client";

export const actionTypeSchema = z.object({
  name: z.string().min(3, "O nome da ação é obrigatório."),
  description: z.string().min(10, "A descrição precisa de mais detalhes."),
});
export const tagSchema = z.object({
  description: z.string().min(5, "A descrição é obrigatória."),
  datePerformed: z.string().min(5, "A data de realização é obrigatória."),
  value: z.coerce.number().min(1, "Os pontos devem ser maiores que zero."),
  actionTypeId: z.string({
    required_error: "É necessário selecionar um tipo de ação.",
  }),
});
export const addTagToUsersSchema = z.object({
  userIds: z.array(z.string()).min(1, "Selecione pelo menos um utilizador."),
  tagId: z.string({ required_error: "É necessário selecionar uma tag." }),
});
export type UserRankingInfo = User & { totalPoints: number; tagsCount: number };
export type TagWithAction = Tag & { actionType: { name: string } | null };
export type ActionTypeWithCount = ActionType & { _count: { tags: number } };

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
      .url("Insira um link válido do Instagram")
      .optional()
      .or(z.literal("")),
    linkedin: z
      .string()
      .url("Insira um link válido do LinkedIn")
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
  });

export type ExMemberType = z.infer<typeof exMemberSchema>;

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
  instagram: z.string().url("URL do Instagram inválida").optional(),
  linkedin: z.string().url("URL do LinkedIn inválida").optional(),
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
          return ["image/jpeg", "image/png"].includes(file.type);
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
  });

export type memberType = z.infer<typeof memberSchema>;
export type UserProfileValues = z.infer<typeof userProfileSchema>;
export type MemberWithRoles = User & { roles: Role[] };
export type MemberWithFullRoles = User & { roles: Role[]; currentRole: Role };
export type RegistrationRequestWithRoles = RegistrationRequest & {
  roles: Role[];
};
export type UniversalMember =
  | MemberWithFullRoles
  | RegistrationRequestWithRoles;

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
    .url("Insira um link válido do Instagram")
    .optional()
    .or(z.literal("")),
  linkedin: z
    .string()
    .url("Insira um link válido do LinkedIn")
    .optional()
    .or(z.literal("")),
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
export type FullUser = User & { roles: Role[], currentRole: Role };

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
  description: z.string().min(10, "A descrição é obrigatória."),
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


export const roleCreateSchema = z.object({
  name: z.string().min(3, "O nome do cargo é obrigatório."),
  description: z.string().min(10, "A descrição é obrigatória."),
  area: z.array(z.nativeEnum(AreaRoles)).min(1, "Selecione pelo menos uma área."),
});

export const roleUpdateSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  area: z.array(z.nativeEnum(AreaRoles)).min(1).optional(),
});


export type ExtendedReservation = RoomReservation & {
  user: { name: string; imageUrl: string | null, id:string };
  room: { name: string };
};

// --- Schema Zod para o formulário do modal ---
export const reservationSchema = z.object({
  date: z.string().min(1, "A data é obrigatória."),
  hourEnter: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM).").min(1, "O horário de entrada é obrigatório."),
  hourLeave: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM).").min(1, "O horário de saída é obrigatório."),
  roomId: z.string({ required_error: "É necessário selecionar uma sala." }),
});
export type ReservationFormValues = z.infer<typeof reservationSchema>;

export const apiReservationSchema = z.object({
  date: z.string().datetime({ message: "Formato de data inválido." }),
  hourEnter: z.string().datetime({ message: "Formato de hora de entrada inválido." }),
  hourLeave: z.string().datetime({ message: "Formato de hora de saída inválido." }),
  roomId: z.string(),
  userId: z.string(), // userId é adicionado ao corpo da requisição no backend
  status: z.nativeEnum(RoomStatus),
});

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

export const linkSchema = z.object({
  title: z.string().min(1, "O título é obrigatório."),
  url: z.string().url("Por favor, insira uma URL válida."),
});
export type LinkFormData = z.infer<typeof linkSchema>;

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

