/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse, parseBrazilianDate } from "../shared/utils";
import { getTasksWhereClauseForUser } from "../shared/permissions";
import { taskCreateSchema } from "../shared/schemas";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const authUser = await getAuthenticatedUserFromEvent(event);
  if (!authUser) return createResponse(401, { message: "Não autorizado" });

  switch (event.httpMethod) {
    case "GET":
      return await handleGet(authUser);
    case "POST":
      return await handlePost(authUser, event.body);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

async function handleGet(authUser: any): Promise<APIGatewayProxyResult> {
  try {
    const prisma = await getPrismaClient();
    const whereClause = getTasksWhereClauseForUser(authUser);
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: { responsibles: true },
      orderBy: { deadline: "asc" },
    });
    return createResponse(200, tasks);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao buscar tarefas.",
      error: error.message,
    });
  }
}

async function handlePost(
  authUser: any,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const data = JSON.parse(body);
    const validation = taskCreateSchema.safeParse(data);
    if (!validation.success)
      return createResponse(400, {
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });

    const { responsibles, deadline, ...taskData } = validation.data;
    const parsedDeadline =
      typeof deadline === "string" ? parseBrazilianDate(deadline) : new Date();

    const prisma = await getPrismaClient();
    const newTask = await prisma.task.create({
      data: {
        ...taskData,
        deadline: parsedDeadline as Date,
        authorId: authUser.id,
        author: {connect: {id: authUser.id}},
        responsibles: { connect: responsibles.map((id) => ({ id })) },
      },
    });
    return createResponse(201, newTask);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao criar tarefa.",
      error: error.message,
    });
  }
}
