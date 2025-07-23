/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse, checkUserPermission } from "../shared/utils";
import { DIRECTORS_ONLY } from "../shared/permissions";
import { tagSchema } from "../shared/schemas";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Autenticação e Autorização para todas as operações neste handler
  const authUser = await getAuthenticatedUserFromEvent(event);
  if (!authUser) return createResponse(401, { message: "Não autorizado" });
  if (!checkUserPermission(authUser, DIRECTORS_ONLY))
    return createResponse(403, { message: "Acesso negado." });

  const id = event.pathParameters?.id;
  if (!id) return createResponse(400, { message: "ID da tag é obrigatório." });

  switch (event.httpMethod) {
    case "PATCH":
      return await handlePatch(id, event.body);
    case "DELETE":
      return await handleDelete(id);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

async function handlePatch(
  id: string,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const data = JSON.parse(body);
    const prisma = await getPrismaClient();

    // Caso 1: Desvincular Tag de um usuário
    if (data.userPointsId === null) {
      const tag = await prisma.tag.findUnique({
        where: { id },
        include: { userPoints: true },
      });
      if (!tag?.userPointsId)
        return createResponse(404, {
          message: "Tag não encontrada ou já desvinculada.",
        });

      await prisma.$transaction([
        prisma.userPoints.update({
          where: { id: tag.userPointsId },
          data: { totalPoints: { decrement: tag.value } },
        }),
        prisma.tag.update({
          where: { id },
          data: { userPointsId: null },
        }),
      ]);
      return createResponse(200, { message: "Tag desvinculada com sucesso." });
    }

    // Caso 2: Atualizar os dados da tag
    const validation = tagSchema.partial().safeParse(data);
    if (!validation.success)
      return createResponse(400, { message: "Dados inválidos." });

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: validation.data,
    });
    return createResponse(200, updatedTag);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao atualizar a tag.",
      error: error.message,
    });
  }
}

async function handleDelete(id: string): Promise<APIGatewayProxyResult> {
  try {
    const prisma = await getPrismaClient();
    await prisma.$transaction(
      async (tx: {
        tag: {
          findUnique: (arg0: { where: { id: string } }) => any;
          delete: (arg0: { where: { id: string } }) => any;
        };
        userPoints: {
          update: (arg0: {
            where: { id: any };
            data: { totalPoints: { decrement: any } };
          }) => any;
        };
        enterprisePoints: {
          update: (arg0: {
            where: { id: any };
            data: { value: { decrement: any } };
          }) => any;
        };
      }) => {
        const tagToDelete = await tx.tag.findUnique({ where: { id } });
        if (!tagToDelete) throw new Error("Tag não encontrada.");

        if (tagToDelete.userPointsId) {
          await tx.userPoints.update({
            where: { id: tagToDelete.userPointsId },
            data: { totalPoints: { decrement: tagToDelete.value } },
          });
        }
        if (tagToDelete.enterprisePointsId) {
          await tx.enterprisePoints.update({
            where: { id: tagToDelete.enterprisePointsId },
            data: { value: { decrement: tagToDelete.value } },
          });
        }
        await tx.tag.delete({ where: { id } });
      }
    );
    return createResponse(204, null);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao apagar tag.",
      error: error.message,
    });
  }
}
