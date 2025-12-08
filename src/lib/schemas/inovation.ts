import { AreaInovationInitiative, InovationInitiativeType, SubAreaInovationInitiative, InovationHorizonTypes } from "@prisma/client";
import z from "zod";

const linkItemSchema = z.object({
  label: z.string().min(1, { message: "O título do link é obrigatório." }),
  url: z.string().url({ message: "Insira uma URL válida (https://...)" }),
});

export const createInovationInitiativeSchema = z.object({
  // --- ETAPA 1: O Básico ---
  title: z.string().min(3, { message: "O título deve ter no mínimo 3 caracteres." }),
  type: z.nativeEnum(InovationInitiativeType),
  
  shortDescription: z
    .string()
    .max(140, { message: "O resumo deve ter no máximo 140 caracteres." })
    .min(1, { message: "O resumo é obrigatório." }),
  
  semesterId: z.string().min(1, { message: "Selecione um semestre." }),
  
  // O Select retorna string "true"/"false", convertemos para boolean
  isRunning: z.string(), 

  // Datas vêm do input type="date" como string "YYYY-MM-DD" ou vazias
  dateImplemented: z.string().optional(),
  dateColected: z.string().optional(),
  dateChecked: z.string().optional(),

  inovationHorizon: z.nativeEnum(InovationHorizonTypes).optional(),

  // Imagem (Supõe-se que você fez o upload antes e está passando a URL, ou enviará o FormData separadamente)
  imageUrl: z.union([
    z.string(),           // Para URL vinda do banco ou preview string
    z.instanceof(File),   // Para o arquivo gerado pelo Crop
    z.null(),             // Caso limpe a imagem
    z.undefined()
  ]).optional(),  
 

  // Iniciativa Relacionada (Opcional)
  relatedToId: z.string().optional().nullable(),

  // --- ETAPA 2: Detalhes ---
  description: z.string().min(10, { message: "A descrição completa é obrigatória." }),

  // Multi-selects retornam array de strings
  areas: z.array(z.nativeEnum(AreaInovationInitiative)).min(1, { message: "Selecione pelo menos uma área." }),
  subAreas: z.array(z.nativeEnum(SubAreaInovationInitiative)).min(1, { message: "Selecione pelo menos uma subárea." }),
  members: z.array(z.string()).optional(), // Array de IDs de usuários

  // Link único do formulário (valida URL se não for vazio)
 links: z.array(linkItemSchema)
    .optional(),

  // Tags: O input é uma string separada por vírgulas, transformamos em array para o banco
  tags: z.string(),

  // --- ETAPA 3: Método S.O.C.I.O (Opcionais) ---
  sentido: z.string().optional(),
  organizacao: z.string().optional(),
  cultura: z.string().optional(),
  influencia: z.string().optional(),
  operacao: z.string().optional(),

  reviewNotes: z.string().optional()
});

// Tipo inferido para usar no frontend (React Hook Form)
export type CreateInovationValues = z.infer<typeof createInovationInitiativeSchema>;