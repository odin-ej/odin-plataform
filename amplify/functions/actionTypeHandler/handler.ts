/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// --- Imports atualizados para o caminho da Lambda Layer ---
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { actionTypeSchema } from "../shared/schemas"; // O mesmo schema que você forneceu

// Helper para criar respostas padronizadas
function createResponse(
  statusCode: number,
  body: object | null
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Em produção, restrinja para o seu domínio
    },
    body: body ? JSON.stringify(body) : "",
  };
}

// Handler principal que roteia com base no método
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  switch (event.httpMethod) {
    case "GET":
      return await handleGetAll(event);
    case "POST":
      return await handlePost(event);
    case "PATCH":
      return await handlePatch(event);
    case "DELETE":
      return await handleDelete(event);
    default:
      return createResponse(405, {
        message: `Método ${event.httpMethod} não permitido.`,
      });
  }
};

async function handleGetAll(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });
    const prisma = await getPrismaClient();
    const actionTypes = await prisma.actionType.findMany({
      orderBy: { name: "asc" }, // Opcional: ordenar o resultado
    });

    return createResponse(200, actionTypes);
  } catch (error: any) {
    console.error("Erro em handleGetAll:", error);
    return createResponse(500, {
      message: "Erro interno ao buscar os tipos de ação.",
    });
  }
}

// --- Lógica para POST (Criar Novo) ---
async function handlePost(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);

    const validation = actionTypeSchema.safeParse(body);
    if (!validation.success) {
      return createResponse(400, {
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }
    const prisma = await getPrismaClient();
    const newActionType = await prisma.actionType.create({
      data: validation.data,
    });

    return createResponse(201, newActionType);
  } catch (error: any) {
    console.error("Erro em handlePost:", error);
    // Trata erro de valor único (ex: nome já existe)
    if (error.code === "P2002") {
      return createResponse(409, {
        message: `Já existe um tipo de ação com este nome.`,
      });
    }
    return createResponse(500, {
      message: "Erro interno ao criar o tipo de ação.",
    });
  }
}

// Lógica específica do PATCH
async function handlePatch(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    const id = event.pathParameters?.id;
    if (!id)
      return createResponse(400, { message: "ID da ação é obrigatório." });

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);

    const validation = actionTypeSchema.partial().safeParse(body);
    if (!validation.success) {
      return createResponse(400, { message: "Dados inválidos." });
    }
    const prisma = await getPrismaClient();
    const updatedAction = await prisma.actionType.update({
      where: { id },
      data: validation.data,
    });

    return createResponse(200, updatedAction);
  } catch (error: any) {
    console.error("Erro no handlePatch:", error);
    if (error.code === "P2025")
      return createResponse(404, { message: "ActionType não encontrado." });
    return createResponse(500, { message: "Erro interno ao atualizar." });
  }
}

// Lógica específica do DELETE
async function handleDelete(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    const id = event.pathParameters?.id;
    if (!id)
      return createResponse(400, { message: "ID da ação é obrigatório." });
    const prisma = await getPrismaClient();
    await prisma.actionType.delete({ where: { id } });

    return createResponse(204, null);
  } catch (error: any) {
    console.error("Erro no handleDelete:", error);
    if (error.code === "P2003")
      return createResponse(409, {
        message: "Ação em uso, não pode ser apagada.",
      });
    if (error.code === "P2025")
      return createResponse(404, {
        message: "ActionType não encontrado para apagar.",
      });
    return createResponse(500, { message: "Erro interno ao apagar." });
  }
}
