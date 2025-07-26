/* eslint-disable @typescript-eslint/no-explicit-any */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse, checkUserPermission } from "../shared/utils";
import { apiReservationSchema } from "../shared/schemas";
import { DIRECTORS_ONLY } from "../shared/permissions";
import { getGoogleAuthToken } from "../shared/google-auth"; // <-- 1. Importar a função

async function handlePatch(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    const id = event.pathParameters?.id;
    if (!id) return createResponse(400, { message: "ID da reserva é obrigatório." });

    if (!event.body) return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);
    const validation = apiReservationSchema.partial().safeParse(body);
    if (!validation.success) return createResponse(400, { message: "Dados inválidos" });

    const prisma = await getPrismaClient();
    const reservation = await prisma.roomReservation.findUnique({ where: { id } });
    if (reservation?.userId !== authUser.id && !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return createResponse(403, { message: "Você não tem permissão para editar esta reserva." });
    }

    const updatedReservation = await prisma.roomReservation.update({
      where: { id },
      data: validation.data,
      // <-- 2. Adicionar 'select' para obter os dados necessários para o Google
      select: {
        room: { select: { name: true } },
        hourEnter: true,
        hourLeave: true,
        //@ts-expect-error `googleCalendarEventId` is in the schema
        googleCalendarEventId: true,
      },
    });
    
    // <-- 3. Inserir a lógica de integração com o Google Calendar
      //@ts-expect-error `googleCalendarEventId` is in the schema
    if (updatedReservation.googleCalendarEventId) {
        const googleApiResponse = await fetch(
            //@ts-expect-error `googleCalendarEventId` is in the schema
            `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events/${updatedReservation.googleCalendarEventId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await getGoogleAuthToken()}`,
                },
                body: JSON.stringify({
                    //@ts-expect-error `room` is in the schema
                    summary: `Reserva da sala ${updatedReservation.room.name}`,
                    start: { dateTime: updatedReservation.hourEnter, timeZone: "America/Sao_Paulo" },
                    end: { dateTime: updatedReservation.hourLeave, timeZone: "America/Sao_Paulo" },
                }),
            }
        );

        if (!googleApiResponse.ok) {
            console.error("Falha ao ATUALIZAR evento no Google Calendar:", await googleApiResponse.json());
            // A operação no DB já ocorreu, então apenas logamos o erro de sincronização
        }
    }
    
    return createResponse(200, updatedReservation);
  } catch (error: any) {
    return createResponse(500, { message: "Erro ao atualizar reserva.", error: error.message });
  }
}

async function handleDelete(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    const id = event.pathParameters?.id;
    if (!id) return createResponse(400, { message: "ID da reserva é obrigatório." });

    const prisma = await getPrismaClient();
    const reservation = await prisma.roomReservation.findUnique({ where: { id } });
    if (reservation?.userId !== authUser.id && !checkUserPermission(authUser, DIRECTORS_ONLY)) {
        return createResponse(403, { message: "Você não tem permissão para apagar esta reserva." });
    }

    // <-- 4. Inserir a lógica de deleção do Google Calendar ANTES de deletar do DB
    // É mais seguro deletar o recurso externo primeiro.
      //@ts-expect-error `googleCalendarEventId` is in the schema
    if (reservation && reservation.googleCalendarEventId) {
        const googleApiResponse = await fetch(
            //@ts-expect-error `googleCalendarEventId` is in the schema
            `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events/${reservation.googleCalendarEventId}`,
            {
                method: "DELETE",
                headers: { Authorization: `Bearer ${await getGoogleAuthToken()}` },
            }
        );

        // Se a resposta não for OK (e não for 404, que significa que já foi deletado), logue o erro.
        if (!googleApiResponse.ok && googleApiResponse.status !== 404) {
             console.error("Falha ao DELETAR evento no Google Calendar:", await googleApiResponse.text());
             // Você pode optar por parar a operação aqui se a sincronização for crítica.
        }
    }
    
    await prisma.roomReservation.delete({ where: { id } });
    return createResponse(204, null);
  } catch (error: any) {
    if (error.code === "P2025") return createResponse(404, { message: "Reserva não encontrada." });
    return createResponse(500, { message: "Erro ao apagar reserva.", error: error.message });
  }
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  switch (event.httpMethod) {
    case "PATCH":
      return await handlePatch(event);
    case "DELETE":
      return await handleDelete(event);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};