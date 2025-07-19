import {AreaRoles} from "@prisma/client"
import { z } from "zod";

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