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

    // No Lambda, o ID do usuário logado vem do token, ou pode-se pegar da URL
    // Para segurança, vamos usar o ID do usuário autenticado, ignorando o da URL
    const userIdToFetch =
      event.pathParameters?.id === authUser.id ? authUser.id : authUser.id;

    const prisma = await getPrismaClient();
    const points = await prisma.userPoints.findUnique({
      where: { userId: userIdToFetch },
      include: {
        tags: {
          include: { actionType: { select: { name: true } } },
        },
      },
    });

    if (!points) {
      return createResponse(404, {
        message: "Registro de pontos não encontrado para este usuário.",
      });
    }

    return createResponse(200, { myPoints: points });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao buscar pontos:", error);
    return createResponse(500, {
      message: "Erro ao buscar pontos.",
      error: error.message,
    });
  }
};
