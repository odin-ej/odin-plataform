/* eslint-disable @typescript-eslint/no-explicit-any */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";
import { apiReservationSchema } from "../shared/schemas";
import { getGoogleAuthToken } from "../shared/google-auth"; // <-- 1. Importar a função

async function handlePost(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    if (!event.body) return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);

    const validation = apiReservationSchema.safeParse({ ...body, userId: authUser.id });
    if (!validation.success) {
      return createResponse(400, { message: "Dados inválidos.", errors: validation.error.flatten().fieldErrors });
    }

    const prisma = await getPrismaClient();

    // <-- 2. Adicionar a lógica de integração com Google Calendar
    const room = await prisma.room.findUnique({
        where: { id: validation.data.roomId },
        select: { name: true },
    });
    
    const googleRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await getGoogleAuthToken()}`,
            },
            body: JSON.stringify({
                summary: `Reserva da sala ${room?.name}`,
                description: `Reservado por: ${authUser.name}`,
                start: { dateTime: validation.data.hourEnter, timeZone: "America/Sao_Paulo" },
                end: { dateTime: validation.data.hourLeave, timeZone: "America/Sao_Paulo" },
            }),
        }
    );
      
    if (!googleRes.ok) {
        const errorDetails = await googleRes.json();
        console.error("Falha ao CRIAR evento no Google Calendar:", JSON.stringify(errorDetails, null, 2));
        return createResponse(502, { message: "Erro ao agendar no Google Calendar." });
    }

    const googleData = await googleRes.json();
    
    // <-- 3. Criar a reserva no DB com o ID do Google
    const newReservation = await prisma.roomReservation.create({
      data: {
        ...validation.data,
        googleCalendarEventId: googleData.id,
      },
    });

    return createResponse(201, newReservation);
  } catch (error: any) {
    return createResponse(500, { message: "Erro ao criar reserva.", error: error.message });
  }
}

// O handleGet permanece o mesmo
async function handleGet(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const authUser = await getAuthenticatedUserFromEvent(event);
        if (!authUser) return createResponse(401, { message: "Não autorizado" });

        const prisma = await getPrismaClient();
        const [reservations, rooms] = await Promise.all([
            prisma.roomReservation.findMany({
                include: {
                    user: { select: { name: true, imageUrl: true, id: true } },
                    room: { select: { name: true } },
                },
                orderBy: { date: "desc" },
            }),
            prisma.room.findMany(),
        ]);

        return createResponse(200, { rooms, reservations });
    } catch (error: any) {
        return createResponse(500, { message: "Erro ao buscar reservas.", error: error.message });
    }
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  switch (event.httpMethod) {
    case "GET":
      return await handleGet(event);
    case "POST":
      return await handlePost(event);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};