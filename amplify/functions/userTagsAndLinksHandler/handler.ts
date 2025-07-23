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

    const id = event.pathParameters?.id;
    if (!id)
      return createResponse(400, { message: "ID do usuário é obrigatório." });

    // Verifica qual sub-rota foi chamada: /tags ou /useful-links
    if (event.path.endsWith("/tags")) {
      const prisma = await getPrismaClient();
      const userTags = await prisma.tag.findMany({
        where: { userPoints: { userId: id } },
        orderBy: { datePerformed: "desc" },
      });
      return createResponse(200, userTags);
    }

    if (event.path.endsWith("/useful-links")) {
      const prisma = await getPrismaClient();
      const links = await prisma.usefulLink.findMany({ where: { userId: id } });
      return createResponse(200, { links });
    }

    return createResponse(404, { message: "Rota não encontrada." });
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao buscar dados do usuário.",
      error: error.message,
    });
  }
};
