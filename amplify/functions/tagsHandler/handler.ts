/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";

const tagSchema = z.object({
  description: z.string().min(5),
  value: z.coerce.number().min(1),
  actionTypeId: z.string(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Autenticação necessária para ambas as operações
  const authUser = await getAuthenticatedUserFromEvent(event);
  if (!authUser) return createResponse(401, { message: "Não autorizado" });

  switch (event.httpMethod) {
    case "GET":
      return await handleGet();
    case "POST":
      return await handlePost(event.body);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

async function handleGet(): Promise<APIGatewayProxyResult> {
  try {
    const prisma = await getPrismaClient();
    // A lógica original era buscar todas as tags. Se for para buscar só as "molde", adicionamos o where:
    const tags = await prisma.tag.findMany({
      where: { userPointsId: null, enterprisePointsId: null },
    });
    return createResponse(200, tags);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao buscar tags.",
      error: error.message,
    });
  }
}

async function handlePost(body: string | null): Promise<APIGatewayProxyResult> {
  try {
    if (!body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const data = JSON.parse(body);
    const validation = tagSchema.safeParse(data);
    if (!validation.success)
      return createResponse(400, { message: "Dados inválidos." });

    const prisma = await getPrismaClient();
    const newTag = await prisma.tag.create({
      data: {
        ...validation.data,
        datePerformed: new Date(), // A data é sempre a da criação do molde
      },
    });
    return createResponse(201, newTag);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao criar tag.",
      error: error.message,
    });
  }
}
