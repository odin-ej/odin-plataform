import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { cultureUpdateSchema } from "../shared/schemas"; // Assumindo que este schema está no arquivo de schemas da Layer
import { createResponse } from "../shared/utils";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  switch (event.httpMethod) {
    case "GET":
      return await handleGet(event);
    case "PATCH":
      return await handlePatch(event);
    default:
      return createResponse(405, {
        message: `Método ${event.httpMethod} não permitido.`,
      });
  }
};

async function handleGet(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) {
      return createResponse(401, { message: "Não autorizado" });
    }

    const prisma = await getPrismaClient();
    const estrategyPlan = await prisma.estrategyPlan.findFirst({
      // Geralmente há apenas um plano estratégico
      include: {
        values: true,
        estrategyObjectives: true,
      },
    });

    if (!estrategyPlan) {
      return createResponse(404, {
        message: "Nenhum plano estratégico encontrado.",
      });
    }

    return createResponse(200, estrategyPlan);
  } catch (error) {
    console.error("Erro ao buscar plano estratégico:", error);
    return createResponse(500, {
      message: "Erro ao buscar plano estratégico.",
    });
  }
}

async function handlePatch(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) {
      return createResponse(401, { message: "Não autorizado" });
    }

    if (!event.body) {
      return createResponse(400, { message: "Corpo da requisição ausente." });
    }
    const body = JSON.parse(event.body);

    const validation = cultureUpdateSchema.safeParse(body);
    if (!validation.success) {
      return createResponse(400, {
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const prisma = await getPrismaClient();
    // Supondo que você sempre atualiza o plano com id=1, como no seu código original.
    // Se for dinâmico, o ID precisaria vir de algum lugar.
    const updatedCulture = await prisma.estrategyPlan.update({
      where: { id: 1 },
      data: validation.data,
    });

    return createResponse(200, updatedCulture);
  } catch (error) {
    console.error("Erro ao atualizar plano estratégico:", error);
    return createResponse(500, {
      message: "Erro ao atualizar plano estratégico.",
    });
  }
}
