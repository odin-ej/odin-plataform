/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { createResponse } from "../shared/utils";
import { parseBrazilianDate } from "../shared/utils"; // Supondo que esta função esteja nos seus utils da Layer

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  switch (event.httpMethod) {
    case "POST":
      return await handlePost(event);
    case "GET":
      return await handleGet(event);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

async function handlePost(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);
    const {
      email,
      emailEJ,
      password,
      name,
      birthDate,
      roles,
      roleId,
      ...rest
    } = body;

    if (!email || !password || !name) {
      return createResponse(400, { message: "Campos essenciais em falta." });
    }

    const prisma = await getPrismaClient();
    const existingRequest = await prisma.registrationRequest.findFirst({
      where: { OR: [{ email }, { emailEJ }] },
    });
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { emailEJ }] },
    });

    if (existingRequest || existingUser) {
      return createResponse(409, { message: "Este e-mail já foi utilizado." });
    }

    const parsedBirthDate =
      typeof birthDate === "string" ? parseBrazilianDate(birthDate) : null;
    if (!parsedBirthDate) {
      return createResponse(400, {
        message: "Data de nascimento inválida. Use o formato DD/MM/AAAA.",
      });
    }

    // Lógica para conectar roles
    const uniqueRoleIds = new Set<string>();
    if (roleId) uniqueRoleIds.add(roleId);
    if (roles && Array.isArray(roles))
      roles.forEach((id) => uniqueRoleIds.add(id));
    const rolesToConnect = Array.from(uniqueRoleIds).map((id) => ({ id }));

    await prisma.registrationRequest.create({
      data: {
        name,
        email,
        emailEJ,
        password,
        birthDate: parsedBirthDate,
        ...rest,
        roles: { connect: rolesToConnect },
      },
    });

    return createResponse(201, {
      message: "Pedido de registo enviado com sucesso!",
    });
  } catch (error: any) {
    console.error("Erro ao criar pedido de registo:", error);
    return createResponse(500, {
      message: `Ocorreu um erro interno: ${error.message}`,
    });
  }
}

async function handleGet(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const prisma = await getPrismaClient();
    const requests = await prisma.registrationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { roles: true },
    });
    return createResponse(200, { requests });
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao buscar pedidos.",
      error: error.message,
    });
  }
}
