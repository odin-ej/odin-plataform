/* eslint-disable @typescript-eslint/no-explicit-any */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";

// Supondo que este schema está na sua Layer, em ../shared/schemas
const goalUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  goal: z.coerce.number().min(0).optional(),
  value: z.coerce.number().min(0).optional(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) {
      return createResponse(401, { message: "Não autorizado" });
    }

    const id = event.pathParameters?.id;
    if (!id) {
      return createResponse(400, { message: "ID da meta é obrigatório." });
    }

    if (!event.body) {
      return createResponse(400, { message: "Corpo da requisição ausente." });
    }
    const body = JSON.parse(event.body);
    const validation = goalUpdateSchema.safeParse(body);

    if (!validation.success) {
      return createResponse(400, {
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const prisma = await getPrismaClient();
    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: validation.data,
    });

    return createResponse(200, updatedGoal);
  } catch (error: any) {
    console.error("Erro ao atualizar meta:", error);
    if (error.code === "P2025") {
      return createResponse(404, { message: "Meta não encontrada." });
    }
    return createResponse(500, {
      message: "Ocorreu um erro no servidor.",
      error: error.message,
    });
  }
};
