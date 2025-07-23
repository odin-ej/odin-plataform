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
    const tasks = await prisma.task.findMany({
      where: {
        responsibles: { some: { id: authUser.id } },
        status: "PENDING",
      },
      include: { responsibles: true },
      orderBy: { deadline: "asc" },
    });

    return createResponse(200, tasks);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao buscar tarefas:", error);
    return createResponse(500, {
      message: "Erro ao buscar tarefas.",
      error: error.message,
    });
  }
};
