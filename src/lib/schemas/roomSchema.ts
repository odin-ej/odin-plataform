import { RoomReservation, RoomStatus } from "@prisma/client";
import z from "zod";

export type ExtendedReservation = RoomReservation & {
  user: { name: string; imageUrl: string | null; id: string };
  room: { name: string };
};

// --- Schema Zod para o formulário do modal ---
export const reservationSchema = z.object({
  date: z.string().min(1, "A data é obrigatória."),
  title: z.string().min(1,'O título/finalidade é obrigatório'),
  hourEnter: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM).")
    .min(1, "O horário de entrada é obrigatório."),
  hourLeave: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM).")
    .min(1, "O horário de saída é obrigatório."),
  roomId: z.string({ required_error: "É necessário selecionar uma sala." }),
});
export type ReservationFormValues = z.infer<typeof reservationSchema>;

export const apiReservationSchema = z.object({
  date: z.string().datetime({ message: "Formato de data inválido." }),
  title: z.string(),
  hourEnter: z
    .string()
    .datetime({ message: "Formato de hora de entrada inválido." }),
  hourLeave: z
    .string()
    .datetime({ message: "Formato de hora de saída inválido." }),
  roomId: z.string(),
  userId: z.string(), // userId é adicionado ao corpo da requisição no backend
  status: z.nativeEnum(RoomStatus),
});
