/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse, checkUserPermission } from "../shared/utils";
import { DIRECTORS_ONLY } from "../shared/permissions"; // Importa a regra de permissão

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Autenticação e Autorização
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) {
      return createResponse(401, { message: "Acesso negado." });
    }
    if (!checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return createResponse(403, {
        message: "Apenas diretores podem alterar a visibilidade do ranking.",
      });
    }

    if (!event.body) {
      return createResponse(400, { message: "Corpo da requisição ausente." });
    }
    const { isHidden } = JSON.parse(event.body);

    // 2. Validação
    if (typeof isHidden !== "boolean") {
      return createResponse(400, {
        message: "Valor 'isHidden' inválido. Deve ser um booleano.",
      });
    }

    // 3. Lógica de Negócio
    const prisma = await getPrismaClient();
    await prisma.jRPointsRanking.upsert({
      where: { id: 1 },
      update: { isHidden },
      create: { id: 1, isHidden },
    });

    return createResponse(200, {
      message: "Visibilidade do ranking atualizada com sucesso.",
    });
  } catch (error: any) {
    console.error("Erro ao atualizar visibilidade do ranking:", error);
    return createResponse(500, {
      message: "Ocorreu um erro no servidor.",
      error: error.message,
    });
  }
};
