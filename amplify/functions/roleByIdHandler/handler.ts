/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";
import { roleUpdateSchema } from "../shared/schemas"; // Supondo que o schema Zod está na Layer

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;
  if (!id) {
    return createResponse(400, { message: "ID do cargo é obrigatório." });
  }

  // Todas as rotas aqui precisam de autenticação
  const authUser = await getAuthenticatedUserFromEvent(event);
  if (!authUser) {
    return createResponse(401, { message: "Não autorizado" });
  }

  switch (event.httpMethod) {
    case "GET":
      return await handleGet(id);
    case "PATCH":
      return await handlePatch(id, event.body);
    case "DELETE":
      return await handleDelete(id);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

/**
 * Busca um cargo específico pelo ID.
 */
async function handleGet(id: string): Promise<APIGatewayProxyResult> {
  try {
    const prisma = await getPrismaClient();
    const role = await prisma.role.findUnique({ where: { id } });

    if (!role) {
      return createResponse(404, { message: "Cargo não encontrado." });
    }
    return createResponse(200, role);
  } catch (error: any) {
    console.error("Erro ao buscar cargo:", error);
    return createResponse(500, {
      message: "Erro ao buscar cargo.",
      error: error.message,
    });
  }
}

/**
 * Atualiza um cargo específico.
 */
async function handlePatch(
  id: string,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return createResponse(400, { message: "Corpo da requisição ausente." });
    }
    const data = JSON.parse(body);
    const validation = roleUpdateSchema.safeParse(data);

    if (!validation.success) {
      return createResponse(400, {
        message: "Dados de atualização inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const prisma = await getPrismaClient();
    const updatedRole = await prisma.role.update({
      where: { id },
      data: validation.data,
    });

    return createResponse(200, updatedRole);
  } catch (error: any) {
    console.error("Erro ao atualizar cargo:", error);
    if (error.code === "P2025") {
      // Erro do Prisma: "Record to update not found."
      return createResponse(404, {
        message: "Cargo não encontrado para atualizar.",
      });
    }
    return createResponse(500, {
      message: "Erro ao atualizar cargo.",
      error: error.message,
    });
  }
}

/**
 * Apaga um cargo específico.
 */
async function handleDelete(id: string): Promise<APIGatewayProxyResult> {
  try {
    const prisma = await getPrismaClient();
    await prisma.role.delete({ where: { id } });
    return createResponse(204, null); // Sucesso, sem conteúdo
  } catch (error: any) {
    console.error("Erro ao apagar cargo:", error);
    // Erro de restrição de chave estrangeira (cargo em uso)
    if (error.code === "P2003") {
      return createResponse(409, {
        message:
          "Não é possível apagar este cargo pois ele está associado a um ou mais utilizadores.",
      });
    }
    // Erro de item não encontrado para apagar
    if (error.code === "P2025") {
      return createResponse(404, { message: "Cargo não encontrado." });
    }
    return createResponse(500, {
      message: "Erro ao apagar cargo.",
      error: error.message,
    });
  }
}
