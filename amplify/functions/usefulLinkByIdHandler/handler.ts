/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";
import { linkSchema } from "../shared/schemas";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const authUser = await getAuthenticatedUserFromEvent(event);
  if (!authUser) return createResponse(401, { message: "Não autorizado" });

  const id = event.pathParameters?.id;
  if (!id) return createResponse(400, { message: "ID do link é obrigatório." });

  switch (event.httpMethod) {
    case "PATCH":
      return await handlePatch(id, authUser.id, event.body);
    case "DELETE":
      return await handleDelete(id, authUser.id);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

async function handlePatch(
  id: string,
  authUserId: string,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const data = JSON.parse(body);
    const validation = linkSchema.safeParse(data);
    if (!validation.success)
      return createResponse(400, { message: "Dados inválidos" });

    const prisma = await getPrismaClient();
    const link = await prisma.usefulLink.findUnique({ where: { id } });
    if (link?.userId !== authUserId)
      return createResponse(403, {
        message: "Você não tem permissão para editar este link.",
      });

    const updatedLink = await prisma.usefulLink.update({
      where: { id },
      data: validation.data,
    });
    return createResponse(200, updatedLink);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao atualizar link",
      error: error.message,
    });
  }
}

async function handleDelete(
  id: string,
  authUserId: string
): Promise<APIGatewayProxyResult> {
  try {
    const prisma = await getPrismaClient();
    const link = await prisma.usefulLink.findUnique({ where: { id } });
    if (link?.userId !== authUserId)
      return createResponse(403, {
        message: "Você não tem permissão para apagar este link.",
      });

    await prisma.usefulLink.delete({ where: { id } });
    return createResponse(204, null);
  } catch (error: any) {
    if (error.code === "P2025")
      return createResponse(404, { message: "Link não encontrado." });
    return createResponse(500, {
      message: "Erro ao apagar link",
      error: error.message,
    });
  }
}
