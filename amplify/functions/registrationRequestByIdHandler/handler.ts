/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { createResponse } from "../shared/utils";
import { userProfileSchema } from "../shared/schemas";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;
  if (!id)
    return createResponse(400, { message: "ID do pedido é obrigatório." });

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

async function handleGet(id: string): Promise<APIGatewayProxyResult> {
  try {
    const prisma = await getPrismaClient();
    const registrationRequest = await prisma.registrationRequest.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!registrationRequest) {
      return createResponse(404, {
        message: "Pedido de registo não encontrado.",
      });
    }
    return createResponse(200, registrationRequest);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao buscar pedido de registo.",
      error: error.message,
    });
  }
}

async function handlePatch(
  id: string,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const data = JSON.parse(body);

    const validation = userProfileSchema.safeParse(body);
    if (!validation.success) {
      return createResponse(400, {
        message: "Dados de atualização inválidos.",
      });
    }
    const { roleId, roles, ...dataToUpdate } = data;
    const rolesToConnect = new Set<string>();
    if (roleId) rolesToConnect.add(roleId);
    if (Array.isArray(roles)) roles.forEach((rId) => rolesToConnect.add(rId));

    const prisma = await getPrismaClient();
    const updatedRequest = await prisma.registrationRequest.update({
      where: { id },
      data: {
        ...dataToUpdate,
        ...(rolesToConnect.size > 0 && {
          roles: {
            set: Array.from(rolesToConnect).map((rid) => ({ id: rid })),
          },
        }),
      },
      include: { roles: true },
    });

    return createResponse(200, updatedRequest);
  } catch (error: any) {
    if (error.code === "P2025") {
      return createResponse(404, {
        message: "Pedido de registo não encontrado para atualizar.",
      });
    }
    return createResponse(500, {
      message: "Erro ao atualizar pedido de registo.",
      error: error.message,
    });
  }
}

async function handleDelete(id: string): Promise<APIGatewayProxyResult> {
  try {
    const prisma = await getPrismaClient();
    await prisma.registrationRequest.delete({ where: { id } });
    return createResponse(204, null);
  } catch (error: any) {
    if (error.code === "P2025") {
      return createResponse(404, {
        message: "Pedido de registo não encontrado para apagar.",
      });
    }
    return createResponse(500, {
      message: "Erro ao apagar pedido.",
      error: error.message,
    });
  }
}
// Implementação completa do GET e PATCH seria similar, adaptando a lógica.
