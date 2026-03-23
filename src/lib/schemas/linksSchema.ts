import { LinkAreas } from "@prisma/client";
import z from "zod";

export const linkSchema = z.object({
  title: z.string().min(1, "O título é obrigatório."),
  url: z.string().url("Por favor, insira uma URL válida."),
  area: z.nativeEnum(LinkAreas, {
    required_error: "A área é obrigatória.",
  }),
});
export type LinkFormData = z.infer<typeof linkSchema>;