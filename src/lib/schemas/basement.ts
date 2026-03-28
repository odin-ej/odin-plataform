import { z } from "zod";

export const createIdeaSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descreva sua ideia com mais detalhes"),
  category: z.enum(["PROCESSO", "PRODUTO", "TECNOLOGIA", "CULTURA", "OUTRO"]),
  ideaType: z.enum(["INTERNAL", "EXTERNAL"]),
  tags: z.string().optional(),
  problemDescription: z.string().optional(),
  targetAudience: z.string().optional(),
  partners: z.string().optional(),
  resources: z.array(z.string()).optional(),
  // SMART scores (1-5)
  smartSpecific: z.number().min(1).max(5).default(3),
  smartMeasurable: z.number().min(1).max(5).default(3),
  smartAchievable: z.number().min(1).max(5).default(3),
  smartRelevant: z.number().min(1).max(5).default(3),
  smartTimeBound: z.number().min(1).max(5).default(3),
  // SMART texts
  smartSpecificText: z.string().optional(),
  smartMeasurableText: z.string().optional(),
  smartAchievableText: z.string().optional(),
  smartRelevantText: z.string().optional(),
  smartTimeBoundText: z.string().optional(),
});

export type CreateIdeaValues = z.infer<typeof createIdeaSchema>;
