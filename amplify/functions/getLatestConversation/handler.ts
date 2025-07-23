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

    const prisma = await getPrismaClient();
    const lastConversation = await prisma.conversation.findFirst({
      where: { userId: authUser.id },
      orderBy: { updatedAt: "desc" },
    });

    if (!lastConversation)
      return createResponse(404, { message: "Nenhuma conversa encontrada." });

    return createResponse(200, lastConversation);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro no servidor.",
      error: error.message,
    });
  }
};
