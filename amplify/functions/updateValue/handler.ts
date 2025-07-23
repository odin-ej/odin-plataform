import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { valueUpdateSchema } from "../shared/schemas"; // Assumindo que este schema está no arquivo de schemas da Layer
import { createResponse } from "../shared/utils";

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
      return createResponse(400, { message: "ID do valor é obrigatório." });
    }

    if (!event.body) {
      return createResponse(400, { message: "Corpo da requisição ausente." });
    }
    const body = JSON.parse(event.body);

    const validation = valueUpdateSchema.safeParse(body);
    if (!validation.success) {
      return createResponse(400, {
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const prisma = await getPrismaClient();
    const updatedValue = await prisma.value.update({
      where: { id },
      data: validation.data,
    });

    return createResponse(200, updatedValue);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao atualizar valor:", error);
    if (error.code === "P2025") {
      return createResponse(404, { message: "Valor não encontrado." });
    }
    return createResponse(500, { message: "Ocorreu um erro no servidor." });
  }
};
