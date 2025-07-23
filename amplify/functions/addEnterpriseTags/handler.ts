/* eslint-disable @typescript-eslint/no-explicit-any */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
// Assumindo que estes helpers estão na sua Lambda Layer
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";

const addTagsToEnterpriseSchema = z.object({
  tagIds: z.array(z.string()).min(1, "Selecione pelo menos uma tag."),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) {
      return createResponse(401, { message: "Não autorizado" });
    }

    if (!event.body) {
      return createResponse(400, { message: "Corpo da requisição ausente." });
    }
    const body = JSON.parse(event.body);
    const validation = addTagsToEnterpriseSchema.safeParse(body);

    if (!validation.success) {
      return createResponse(400, {
        message: "Dados inválidos.",
        errors: validation.error.formErrors,
      });
    }

    const { tagIds } = validation.data;
    const enterprisePointsId = 1;
    const prisma = await getPrismaClient();

    await prisma.$transaction(
      async (tx: {
        tag: {
          findUnique: (arg0: { where: { id: string } }) => any;
          create: (arg0: {
            data: {
              description: any;
              value: any;
              datePerformed: Date;
              actionTypeId: any;
              enterprisePointsId: number;
            };
          }) => any;
        };
        enterprisePoints: {
          update: (arg0: {
            where: { id: number };
            data: { value: { increment: any } };
          }) => any;
        };
      }) => {
        for (const tagId of tagIds) {
          const templateTag = await tx.tag.findUnique({ where: { id: tagId } });
          if (!templateTag)
            throw new Error(`A tag com ID ${tagId} não foi encontrada.`);

          await tx.tag.create({
            data: {
              description: templateTag.description,
              value: templateTag.value,
              datePerformed: new Date(),
              actionTypeId: templateTag.actionTypeId,
              enterprisePointsId: enterprisePointsId,
            },
          });
          await tx.enterprisePoints.update({
            where: { id: enterprisePointsId },
            data: { value: { increment: templateTag.value } },
          });
        }
      }
    );

    return createResponse(200, {
      message: `${tagIds.length} tag(s) adicionada(s) à empresa com sucesso!`,
    });
  } catch (error: any) {
    console.error("Erro ao adicionar tags à empresa:", error);
    return createResponse(500, {
      message: "Erro ao adicionar tags à empresa.",
      error: error.message,
    });
  }
};
