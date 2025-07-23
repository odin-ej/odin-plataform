/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import bcrypt from "bcrypt";

// Imports da nossa Lambda Layer

// Imports do SDK da AWS (precisam estar no package.json da Layer)
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SESClient } from "@aws-sdk/client-ses";
import {
  checkUserPermission,
  createResponse,
  getFriendlyErrorMessage,
} from "../shared/utils";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { getPrismaClient } from "../shared/db";
import {
  exMemberWelcomeEmailCommand,
  welcomeEmailCommand,
} from "../shared/email";
import { DIRECTORS_ONLY } from "../shared/permissions";

// Inicialização dos clientes AWS
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});
const sesClient = new SESClient({ region: process.env.REGION });

const registerManySchema = z.object({
  ids: z
    .array(z.string().uuid("ID inválido."))
    .min(1, "Pelo menos um ID de pedido é necessário."),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return createResponse(403, { message: "Acesso negado." });
    }

    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const body = JSON.parse(event.body);
    const validation = registerManySchema.safeParse(body);
    if (!validation.success) {
      return createResponse(400, {
        message: "Dados inválidos.",
        errors: validation.error.formErrors.fieldErrors,
      });
    }

    const { ids } = validation.data;
    const prisma = await getPrismaClient();

    const requestsToProcess = await prisma.registrationRequest.findMany({
      where: { id: { in: ids }, status: "PENDING" },
      include: { roles: true },
    });

    const results = {
      successful: [] as { id: string; email: string }[],
      failed: [] as { id: string; email: string | null; reason: string }[],
    };

    for (const req of requestsToProcess) {
      try {
        if (!req.email || !req.email.includes("@")) {
          throw new Error("Endereço de e-mail inválido ou ausente.");
        }

        // 1. Criar usuário no Cognito
        const cognitoUser = await cognitoClient.send(
          new AdminCreateUserCommand({
            UserPoolId: process.env.AMPLIFY_AUTH_USERPOOL_ID!,
            Username: req.email,
            UserAttributes: [
              { Name: "email", Value: req.email },
              { Name: "name", Value: req.name },
              {
                Name: "birthdate",
                Value: req.birthDate.toISOString().split("T")[0],
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
            MessageAction: "SUPPRESS", // Não envia o email de boas-vindas padrão do Cognito
          })
        );

        // 2. Definir a senha permanente
        await cognitoClient.send(
          new AdminSetUserPasswordCommand({
            UserPoolId: process.env.AMPLIFY_AUTH_USERPOOL_ID!,
            Username: req.email,
            Password: req.password,
            Permanent: true,
          })
        );

        // 3. Preparar e criar usuário no Prisma
        const hashedPassword = await bcrypt.hash(req.password, 10);
        const cognitoUserId = cognitoUser.User?.Attributes?.find(
          (attr) => attr.Name === "sub"
        )?.Value;
        if (!cognitoUserId)
          throw new Error("Não foi possível obter o ID do usuário do Cognito.");

        const rolesToConnect =
          req.roles
            ?.filter((role: { name: string }) => role.name !== "Outro")
            .map((role: { id: any }) => ({ id: role.id })) || [];

        const newUser = await prisma.user.create({
          data: {
            id: cognitoUserId,
            name: req.name,
            email: req.email,
            emailEJ: req.emailEJ,
            password: hashedPassword,
            birthDate: req.birthDate,
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
            ...(req.isExMember && { isExMember: req.isExMember }),
            ...(req.alumniDreamer && { alumniDreamer: req.alumniDreamer }),
            ...(req.otherRole && { otherRole: req.otherRole }),
            ...(req.semesterLeaveEj && {
              semesterLeaveEj: req.semesterLeaveEj,
            }),
            ...(req.aboutEj && { aboutEj: req.aboutEj }),
          },
        });

        // 4. Enviar email de boas-vindas com SES
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

        // 5. Apagar a solicitação original
        await prisma.registrationRequest.delete({ where: { id: req.id } });

        results.successful.push({ id: req.id, email: req.email });
      } catch (error: any) {
        const friendlyMessage = getFriendlyErrorMessage(error);
        console.error(`Falha ao processar ${req.id} para ${req.email}:`, error);
        results.failed.push({
          id: req.id,
          email: req.email,
          reason: friendlyMessage,
        });

        await prisma.registrationRequest.update({
          where: { id: req.id },
          data: {
            status: "REJECTED",
            adminNotes: `Falha na aprovação: ${friendlyMessage}`,
          },
        });
      }
    }

    return createResponse(200, results);
  } catch (error: any) {
    console.error("Erro no processo de aprovação em massa:", error);
    return createResponse(500, {
      message: "Ocorreu um erro interno no servidor.",
      error: error.message,
    });
  }
};
