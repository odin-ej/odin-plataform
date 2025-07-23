/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";
import { roleCreateSchema } from "../shared/schemas";

type RoleCreateType = z.infer<typeof roleCreateSchema>;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  switch (event.httpMethod) {
    case "GET":
      return await handleGet(event);
    case "POST":
      return await handlePost(event);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

async function handleGet(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const prisma = await getPrismaClient();
    const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
    return createResponse(200, roles);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao buscar cargos.",
      error: error.message,
    });
  }
}

async function handlePost(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);
    const validation = roleCreateSchema.safeParse(body);
    if (!validation.success)
      return createResponse(400, {
        message: "Dados inválidos.",
        errors: validation.error.formErrors,
      });

    const { name, description, area }: RoleCreateType = validation.data;

    const prisma = await getPrismaClient();
    const existingRole = await prisma.role.findUnique({ where: { name } });
    if (existingRole)
      return createResponse(409, {
        message: "Um cargo com este nome já existe.",
      });

    const newRole = await prisma.role.create({
      data: { name, description, area },
    });
    return createResponse(201, newRole);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao criar cargo.",
      error: error.message,
    });
  }
}
