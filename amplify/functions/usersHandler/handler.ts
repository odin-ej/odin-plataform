/* eslint-disable @typescript-eslint/no-explicit-any */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import bcrypt from "bcrypt";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse, getFriendlyErrorMessage } from "../shared/utils"; // Importa o helper de erro
import {
  exMemberWelcomeEmailCommand,
  welcomeEmailCommand,
} from "../shared/email"; // Importa os comandos de email
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SESClient } from "@aws-sdk/client-ses";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});
const sesClient = new SESClient({ region: process.env.REGION });
const registerManySchema = z.object({ ids: z.array(z.string().uuid()).min(1) });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado." });

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);
    const validation = registerManySchema.safeParse(body);
    if (!validation.success)
      return createResponse(400, { message: "Dados inválidos." });

    const { ids } = validation.data;
    const prisma = await getPrismaClient();
    const requestsToProcess = await prisma.registrationRequest.findMany({
      where: { id: { in: ids }, status: "PENDING" },
      include: { roles: true },
    });

    const results = {
      successful: [] as Array<{ id: string; email: string }>,
      failed: [] as Array<{ id: string; email: string | null; reason: string }>,
    };

    for (const req of requestsToProcess) {
      try {
        if (!req.email || !req.email.includes("@")) {
          throw new Error("Endereço de e-mail inválido ou ausente.");
        }

        const userBirthDate = req.birthDate;
        const cognitoUser = await cognitoClient.send(
          new AdminCreateUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID!,
            Username: req.email,
            UserAttributes: [
              { Name: "email", Value: req.email },
              { Name: "name", Value: req.name },
              {
                Name: "birthdate",
                Value: userBirthDate.toISOString().split("T")[0],
              },
              {
                Name: "phone_number",
                Value: `+55${req.phone.replace(/\D/g, "")}`,
              },
              {
                Name: "custom:role",
                Value: req.roles.length > 0 ? req.roles[0].name : "",
              },
              {
                Name: "custom:isExMember",
                Value: String(req.isExMember ?? false),
              },
              { Name: "email_verified", Value: "true" },
            ],
            MessageAction: "SUPPRESS",
          })
        );
        await cognitoClient.send(
          new AdminSetUserPasswordCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID!,
            Username: req.email,
            Password: req.password,
            Permanent: true,
          })
        );

        // --- Lógica de criação no Prisma ---
        const hashedPassword = await bcrypt.hash(req.password, 10);
        const rolesToConnect =
          req.roles
            ?.filter((role: { name: string }) => role.name !== "Outro")
            .map((role: { id: any }) => ({ id: role.id })) || [];

        const userData = {
          id: cognitoUser.User?.Attributes?.find((attr) => attr.Name === "sub")
            ?.Value as string,
          name: req.name,
          email: req.email,
          emailEJ: req.emailEJ,
          password: hashedPassword,
          birthDate: userBirthDate,
          phone: req.phone,
          imageUrl: req.imageUrl,
          semesterEntryEj: req.semesterEntryEj,
          course: req.course,
          instagram: req.instagram,
          linkedin: req.linkedin,
          about: req.about,
          roles: { connect: rolesToConnect },
          ...(rolesToConnect.length > 0 && {
            currentRoleId: rolesToConnect[0].id,
          }),
          ...(req.semesterLeaveEj && { semesterLeaveEj: req.semesterLeaveEj }),
          ...(req.aboutEj && { aboutEj: req.aboutEj }),
          ...(req.isExMember && { isExMember: req.isExMember }),
          ...(req.alumniDreamer && { alumniDreamer: req.alumniDreamer }),
          ...(req.otherRole && { otherRole: req.otherRole }),
        };

        const newUser = await prisma.user.create({ data: userData });

        // --- Lógica de envio de email com SES ---
        if (newUser.isExMember) {
          await sesClient.send(
            exMemberWelcomeEmailCommand({
              email: newUser.email,
              name: newUser.name,
            })
          );
        } else {
          await sesClient.send(
            welcomeEmailCommand({ email: newUser.email, name: newUser.name })
          );
        }

        await prisma.registrationRequest.delete({ where: { id: req.id } });
        results.successful.push({ id: req.id, email: req.email! });
      } catch (error: any) {
        // Usar a função auxiliar melhorada para obter uma mensagem de erro clara.
        const friendlyMessage = getFriendlyErrorMessage(error);

        console.error(
          `Falha ao processar o pedido ${req.id} para ${req.email}:`,
          error
        );
        results.failed.push({
          id: req.id,
          email: req.email,
          reason: friendlyMessage, // Devolve a mensagem amigável para o front-end.
        });

        try {
          await prisma.registrationRequest.update({
            where: { id: req.id },
            data: {
              status: "REJECTED",
              adminNotes: `Falha na aprovação automática: ${friendlyMessage}`, // Guarda a mensagem clara.
            },
          });
        } catch (updateError) {
          console.error(
            `Falha ao atualizar o status do pedido ${req.id} para REJEITADO:`,
            updateError
          );
        }
      }
    }

    return createResponse(200, results);
  } catch (error: any) {
    return createResponse(500, {
      message: "Ocorreu um erro interno no servidor.",
      error: error.message,
    });
  }
};
