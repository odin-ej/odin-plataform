/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { z } from "zod";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SESClient } from "@aws-sdk/client-ses";
import bcrypt from "bcrypt";
import { exMemberWelcomeEmailCommand, welcomeEmailCommand } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/server-utils";

// Configuração dos clientes da AWS
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});
const sesClient = new SESClient({ region: process.env.AWS_REGION });

// Schema de validação para o corpo do pedido
const registerManySchema = z.object({
  ids: z
    .array(z.string().uuid("ID inválido."))
    .min(1, "Pelo menos um ID de pedido é necessário."),
});

// --- FUNÇÃO POST: Aprovar múltiplos pedidos de registo ---
function getFriendlyErrorMessage(error: any): string {
  // Erros do AWS Cognito
  if (error.name === "UsernameExistsException") {
    return "Este e-mail já está a ser utilizado por outro membro no Cognito.";
  }
  if (error.name === "InvalidPasswordException") {
    return "A senha não cumpre os requisitos de segurança (mín. 8 caracteres, com maiúsculas, minúsculas, números e símbolos).";
  }

  // Erros do Prisma (violação de restrição única)
  if (error.code === "P2002") {
    const target = error.meta?.target as string[] | undefined;
    if (target?.includes("email")) {
      return "O e-mail pessoal fornecido já está em uso por outro membro.";
    }
    if (target?.includes("emailEJ")) {
      return "O e-mail EJ fornecido já está em uso por outro membro.";
    }
    if (target?.includes("phone")) {
      return "O número de telefone fornecido já está em uso por outro membro.";
    }
    // Mensagem genérica para outras violações de @unique
    return `O campo '${target?.join(", ")}' já está em uso.`;
  }

  // Erros de relação do Prisma
  if (error.code === "P2025") {
    return "Erro de relação: Um ou mais cargos a serem conectados não foram encontrados na base de dados.";
  }

  // Mensagem padrão para outros erros
  return (
    error.message || "Ocorreu um erro desconhecido durante o processamento."
  );
}

// --- FUNÇÃO POST: Aprovar múltiplos pedidos de registo ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerManySchema.safeParse(body);

    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
    }

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: validation.error.formErrors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { ids } = validation.data;

    const requestsToProcess = await prisma.registrationRequest.findMany({
      where: {
        id: { in: ids },
        status: "PENDING",
      },
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

        const cognitoUser =await cognitoClient.send(
          new AdminCreateUserCommand({
            UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
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
            UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
            Username: req.email,
            Password: req.password,
            Permanent: true,
          })
        );

        const hashedPassword = await bcrypt.hash(req.password, 10);

        const rolesToConnect =
          req.roles
            ?.filter((role) => role.name !== "Outro")
            .map((role) => ({ id: role.id })) || [];

        const userData = {
          id: cognitoUser.User?.Attributes?.find((attr) => attr.Name === "sub")?.Value as string,
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

        results.successful.push({ id: req.id, email: req.email });
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

    revalidatePath('/aprovacao-cadastro')
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Erro no processo de aprovação em massa:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno no servidor." },
      { status: 500 }
    );
  }
}
