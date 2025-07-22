/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse, parseBrazilianDate } from "../shared/utils";
import { taskUpdateSchema } from "../shared/schemas";
import { Prisma } from ".prisma/client";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const authUser = await getAuthenticatedUserFromEvent(event);
  if (!authUser) return createResponse(401, { message: "Não autorizado" });

  const id = event.pathParameters?.id;
  if (!id)
    return createResponse(400, { message: "ID da tarefa é obrigatório." });

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
    const validation = taskUpdateSchema.safeParse(data);
    if (!validation.success)
      return createResponse(400, { message: "Dados inválidos." });

    const { deadline, responsibles, ...restData } = validation.data;
    const dataForPrisma: Prisma.TaskUpdateInput = { ...restData };

    if (deadline) dataForPrisma.deadline = parseBrazilianDate(deadline) as Date;
    if (responsibles)
      dataForPrisma.responsibles = {
        set: responsibles.map((userId) => ({ id: userId })),
      };

    const prisma = await getPrismaClient();
    const updatedTask = await prisma.task.update({
      where: { id },
      data: dataForPrisma,
    });
    return createResponse(200, updatedTask);
  } catch (error: any) {
    return createResponse(500, {
      message: `Houve um erro ao atualizar a task: ${error.message}`,
    });
  }
}

async function handleDelete(id: string): Promise<APIGatewayProxyResult> {
  try {
    const prisma = await getPrismaClient();
    await prisma.task.delete({ where: { id } });
    return createResponse(204, null);
  } catch (error: any) {
    if (error.code === "P2025")
      return createResponse(404, { message: "Tarefa não encontrada." });
    return createResponse(500, {
      message: "Houve um erro ao apagar a task.",
      error: error.message,
    });
  }
}
