import '../shared/prisma-fix.js';
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
    const houseGoals = await prisma.estrategyObjective.findMany({
      include: {
        goals: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return createResponse(200, houseGoals);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao buscar metas da casinha:", error);
    return createResponse(500, {
      message: "Erro ao buscar metas da casinha.",
      error: error.message,
    });
  }
};
