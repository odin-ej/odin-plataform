import { ItemStatus, RoomReservation, RoomStatus, ItemAreas } from "@prisma/client";
import z from "zod";

export type ExtendedReservation = RoomReservation & {
  user: { name: string; imageUrl: string | null; id: string };
  room: { name: string };
};

// 1. Schema base comum
const baseSchema = z.object({
  date: z.string().min(1, "A data é obrigatória."),
});

// 2. Schema para reserva de sala
export const roomReservationSchema = baseSchema.extend({
  type: z.literal("salinha"),
  title: z.string().min(1, "O título/finalidade é obrigatório"),
 hourEnter: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)."),
  hourLeave: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)."),
  roomId: z.string({ required_error: "É necessário selecionar uma sala." }),
  status: z.nativeEnum(RoomStatus),
});
export type RoomReservationFormValues = z.infer<typeof roomReservationSchema>;

// 3. Schema para reserva de item
export const itemReservationSchema = z.object({
  type: z.literal("item"),
  id: z.string().optional(),
  title: z.string(),
  itemId: z.string().min(1, "Selecione um item."),
  startDate: z.string().min(1, "Data de início é obrigatória."),
  startTime: z.string().min(1, "Hora de início é obrigatória."),
  endDate: z.string().min(1, "Data de fim é obrigatória."),
  endTime: z.string().min(1, "Hora de fim é obrigatória."),
});
export type ItemReservationFormValues = z.infer<typeof itemReservationSchema>;

// 4. Schema para pedido eaufba
export const eaufbaReservationSchema = baseSchema.extend({
  type: z.literal("eaufba"),
  title: z.string().min(3, "Título muito curto"),
  description: z.string().min(10, "Descrição muito curta"),
});
export type EaufbaReservationFormValues = z.infer<typeof eaufbaReservationSchema>;

// 5. Union dos três
export const reservationSchema = z.discriminatedUnion("type", [
  roomReservationSchema,
  itemReservationSchema,
  eaufbaReservationSchema,
]);

export type ReservationFormValues = z.infer<typeof reservationSchema>;

export const itemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "O nome é obrigatório."),
  description: z.string(),
  status: z.nativeEnum(ItemStatus),
  areas: z.array(z.nativeEnum(ItemAreas))
});
export type ItemForm = z.infer<typeof itemSchema>;



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