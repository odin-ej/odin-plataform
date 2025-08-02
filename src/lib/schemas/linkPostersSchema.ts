import { LinkPosterArea } from "@prisma/client";
import z from "zod";

export const linkPostersSchema = z.object({
  title: z.string().min(1, "O título é obrigatório."),
  link: z.string().url("Por favor, insira uma URL válida."),
  isActive: z.enum(["Sim", "Não"]),
  areas: z
    .array(z.nativeEnum(LinkPosterArea))
    .min(1, "Selecione pelo menos uma área."),
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
  imageUrl: z.string().url().optional(),
});

export const linkPostersUpdateSchema = linkPostersSchema
  .omit({ image: true })
  .extend({
    id: z.string(),
    image: z.any().optional(),
  });

export type LinkPostersValues = z.infer<typeof linkPostersSchema>;
export type LinkPostersUpdateValues = z.infer<typeof linkPostersUpdateSchema>;
