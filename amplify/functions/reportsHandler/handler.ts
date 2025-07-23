/* eslint-disable @typescript-eslint/no-explicit-any */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";

const reportCreateSchema = z
  .object({
    title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
    content: z.string().min(20, "A descrição precisa de mais detalhes."),
    recipientUserId: z.string().optional(),
    recipientRoleId: z.string().optional(),
  })
  .refine((data) => data.recipientUserId || data.recipientRoleId, {
    message: "É necessário selecionar um destinatário.",
    path: ["recipientUserId"],
  });

// 2. Criamos um tipo a partir do schema usando z.infer
type ReportCreateType = z.infer<typeof reportCreateSchema>;

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
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);
    const validation = reportCreateSchema.safeParse(body);
    if (!validation.success)
      return createResponse(400, {
        message: "Dados inválidos.",
        errors: validation.error.formErrors,
      });

    const {
      title,
      content,
      recipientUserId,
      recipientRoleId,
    }: ReportCreateType = validation.data;

    const prisma = await getPrismaClient();
    const newReport = await prisma.report.create({
      data: {
        title,
        content,
        recipientUserId,
        recipientRoleId,
        status: "DRAFT",
        referentId: authUser.id,
        recipientNotes: "",
      },
    });
    return createResponse(201, newReport);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao criar report.",
      error: error.message,
    });
  }
}

async function handleGet(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    const prisma = await getPrismaClient();
    const [reportsForMe, myReports] = await Promise.all([
      prisma.report.findMany({
        where: { recipientUserId: authUser.id },
        include: { recipientUser: { select: { name: true } } },
      }),
      prisma.report.findMany({
        where: { referentId: authUser.id },
        include: { recipientUser: { select: { name: true } } },
      }),
    ]);
    return createResponse(200, { reportsForMe, myReports });
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao buscar reports.",
      error: error.message,
    });
  }
}
