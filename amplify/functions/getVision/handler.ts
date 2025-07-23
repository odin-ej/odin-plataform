import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { createResponse } from "../shared/utils";

export const handler = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const prisma = await getPrismaClient();
    const estrategyPlan = await prisma.estrategyPlan.findFirst({
      select: {
        vision: true,
      },
    });

    if (!estrategyPlan) {
      return createResponse(404, {
        message: "Plano estratégico não encontrado.",
      });
    }

    return createResponse(200, estrategyPlan);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao buscar visão:", error);
    return createResponse(500, {
      message: "Erro ao buscar visão.",
      error: error.message,
    });
  }
};
