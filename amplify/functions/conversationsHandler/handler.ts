/* eslint-disable @typescript-eslint/no-explicit-any */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  switch (event.httpMethod) {
    case "POST":
      return await handlePost(event);
    case "GET":
      return await handleGet(event);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

async function handlePost(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    const prisma = await getPrismaClient();
    const newConversation = await prisma.conversation.create({
      data: { title: "Nova Conversa", userId: authUser.id },
    });

    return createResponse(201, newConversation);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao criar conversa.",
      error: error.message,
    });
  }
}

async function handleGet(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    const prisma = await getPrismaClient();
    const conversations = await prisma.conversation.findMany({
      where: { userId: authUser.id },
      orderBy: { updatedAt: "desc" },
    });

    return createResponse(200, conversations);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao buscar histórico.",
      error: error.message,
    });
  }
}
