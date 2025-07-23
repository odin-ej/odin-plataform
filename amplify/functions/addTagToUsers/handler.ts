/* eslint-disable @typescript-eslint/no-explicit-any */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";

const addTagToUsersSchema = z.object({
  userIds: z.array(z.string()).min(1),
  tagId: z.string(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);
    const validation = addTagToUsersSchema.safeParse(body);
    if (!validation.success)
      return createResponse(400, { message: "Dados inválidos." });

    const { userIds, tagId } = validation.data;
    const prisma = await getPrismaClient();

    const templateTag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!templateTag)
      return createResponse(404, {
        message: "A tag selecionada não foi encontrada.",
      });

    await prisma.$transaction(async (tx) => {
      for (const userId of userIds) {
        const newTagData = {
          description: templateTag.description,
          value: templateTag.value,
          datePerformed: new Date(),
          actionTypeId: templateTag.actionTypeId,
        };

        if (userId === "enterprise-points-id") {
          const ep = await tx.enterprisePoints.upsert({
            where: { id: 1 },
            update: { value: { increment: templateTag.value } },
            create: {
              id: 1,
              value: templateTag.value,
              description: "Pontuação geral da Empresa JR.",
            },
          });
          await tx.tag.create({
            data: { ...newTagData, enterprisePointsId: ep.id },
          });
        } else {
          const up = await tx.userPoints.upsert({
            where: { userId },
            update: { totalPoints: { increment: templateTag.value } },
            create: { userId, totalPoints: templateTag.value },
          });
          await tx.tag.create({ data: { ...newTagData, userPointsId: up.id } });
        }
      }
    });

    return createResponse(200, {
      message: `${userIds.length} item(ns) receberam a tag com sucesso!`,
    });
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao adicionar tag.",
      error: error.message,
    });
  }
};
