/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  switch (event.httpMethod) {
    case "GET":
      return await handleGet(event);
    case "DELETE":
      return await handleDelete(event);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

async function handleGet(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const conversationId = event.pathParameters?.conversationId;
    if (!conversationId)
      return createResponse(400, { message: "ID da conversa é obrigatório." });

    const prisma = await getPrismaClient();
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation)
      return createResponse(404, { message: "Conversa não encontrada." });
    return createResponse(200, conversation);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao buscar a conversa.",
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

    const conversationId = event.pathParameters?.conversationId;
    if (!conversationId)
      return createResponse(400, { message: "ID da conversa é obrigatório." });

    const prisma = await getPrismaClient();
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: authUser.id },
    });

    if (!conversation)
      return createResponse(404, {
        message: "Conversa não encontrada ou sem permissão para apagar.",
      });

    await prisma.conversation.delete({ where: { id: conversationId } });

    return createResponse(204, null);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao apagar a conversa.",
      error: error.message,
    });
  }
}
