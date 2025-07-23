/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";

const reportUpdateSchema = z.object({
  recipientNotes: z.string().min(5),
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REVIEWED"]),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    const id = event.pathParameters?.id;
    if (!id)
      return createResponse(400, { message: "ID do report é obrigatório." });

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);
    const validation = reportUpdateSchema.safeParse(body);
    if (!validation.success)
      return createResponse(400, {
        message: "Dados inválidos.",
        errors: validation.error.formErrors,
      });

    // Adicional: Verificar se o authUser é o destinatário do report antes de permitir a atualização
    const prisma = await getPrismaClient();
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report)
      return createResponse(404, { message: "Relatório não encontrado." });
    if (report.recipientUserId !== authUser.id)
      return createResponse(403, { message: "Nao autorizado." });

    const updatedReport = await prisma.report.update({
      where: { id },
      data: validation.data,
    });
    return createResponse(200, updatedReport);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao atualizar relatório.",
      error: error.message,
    });
  }
};
