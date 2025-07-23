/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";
import { apiReservationSchema } from "../shared/schemas"; // Supondo que o schema está na Layer

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  switch (event.httpMethod) {
    case "GET":
      return await handleGet(event);
    case "POST":
      return await handlePost(event);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

async function handleGet(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
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
    return createResponse(500, {
      message: "Erro ao buscar reservas.",
      error: error.message,
    });
  }
}

async function handlePost(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);

    const validation = apiReservationSchema.safeParse({
      ...body,
      userId: authUser.id,
    });
    if (!validation.success) {
      return createResponse(400, {
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const prisma = await getPrismaClient();
    const newReservation = await prisma.roomReservation.create({
      data: validation.data,
    });

    return createResponse(201, newReservation);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao criar reserva.",
      error: error.message,
    });
  }
}
