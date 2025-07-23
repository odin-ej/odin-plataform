/* eslint-disable @typescript-eslint/no-explicit-any */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const { title, url } = JSON.parse(event.body);
    if (!title || !url)
      return createResponse(400, { message: "Título e URL são obrigatórios." });

    const prisma = await getPrismaClient();
    const newLink = await prisma.usefulLink.create({
      data: { title, url, userId: authUser.id },
    });
    return createResponse(201, newLink);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao criar link.",
      error: error.message,
    });
  }
};
