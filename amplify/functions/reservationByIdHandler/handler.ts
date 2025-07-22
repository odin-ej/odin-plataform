/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse, checkUserPermission } from "../shared/utils";
import { apiReservationSchema } from "../shared/schemas";
import { DIRECTORS_ONLY } from "../shared/permissions";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  switch (event.httpMethod) {
    case "PATCH":
      return await handlePatch(event);
    case "DELETE":
      return await handleDelete(event);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

async function handlePatch(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    const id = event.pathParameters?.id;
    if (!id)
      return createResponse(400, { message: "ID da reserva é obrigatório." });

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);
    const validation = apiReservationSchema.partial().safeParse(body);
    if (!validation.success)
      return createResponse(400, { message: "Dados inválidos" });

    const prisma = await getPrismaClient();
    // Verificação de permissão: só pode editar se for o dono ou um diretor
    const reservation = await prisma.roomReservation.findUnique({
      where: { id },
    });
    if (
      reservation?.userId !== authUser.id &&
      !checkUserPermission(authUser, DIRECTORS_ONLY)
    ) {
      return createResponse(403, {
        message: "Você não tem permissão para editar esta reserva.",
      });
    }

    const updatedReservation = await prisma.roomReservation.update({
      where: { id },
      data: validation.data,
    });
    return createResponse(200, updatedReservation);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao atualizar reserva.",
      error: error.message,
    });
  }
}

async function handleDelete(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    const id = event.pathParameters?.id;
    if (!id)
      return createResponse(400, { message: "ID da reserva é obrigatório." });

    const prisma = await getPrismaClient();
    // Verificação de permissão: só pode apagar se for o dono ou um diretor
    const reservation = await prisma.roomReservation.findUnique({
      where: { id },
    });
    if (
      reservation?.userId !== authUser.id &&
      !checkUserPermission(authUser, DIRECTORS_ONLY)
    ) {
      return createResponse(403, {
        message: "Você não tem permissão para apagar esta reserva.",
      });
    }

    await prisma.roomReservation.delete({ where: { id } });
    return createResponse(204, null);
  } catch (error: any) {
    if (error.code === "P2025")
      return createResponse(404, { message: "Reserva não encontrada." });
    return createResponse(500, {
      message: "Erro ao apagar reserva.",
      error: error.message,
    });
  }
}
