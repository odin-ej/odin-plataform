import { RequestStatus } from "@prisma/client";
import z from "zod";

export const reserveRequestToConectionsSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  date: z.string().min(1, "A data é obrigatória."),
  description: z
    .string()
    .min(10, "A descrição é obrigatória e precisa ser detalhada."),
  status: z.nativeEnum(RequestStatus).optional(),
});

export type ReserveRequestConectionsValues = z.infer<
  typeof reserveRequestToConectionsSchema
>;

export const apiRequestConectionsSchema = z.object({
  title: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  applicantId: z.string(),
  applicant: z.any(),
  roleId: z.string(),
  status: z.nativeEnum(RequestStatus).optional(),
});

