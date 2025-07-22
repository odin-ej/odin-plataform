/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import {
  createResponse,
  checkUserPermission,
  parseBrazilianDate,
} from "../shared/utils";
import {
  exMemberUpdateSchema,
  memberUpdateSchema,
  MemberUpdateType,
  ExMemberUpdateType,
} from "../shared/schemas";
import { DIRECTORS_ONLY } from "../shared/permissions";
import { Prisma } from ".prisma/client";
import bcrypt from "bcrypt";
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});
const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;
  if (!id)
    return createResponse(400, { message: "ID do usuário é obrigatório." });

  const authUser = await getAuthenticatedUserFromEvent(event);
  if (!authUser) return createResponse(401, { message: "Não autorizado" });

  switch (event.httpMethod) {
    case "GET":
      return await handleGet(id, authUser);
    case "PATCH":
      return await handlePatch(id, authUser, event.body);
    case "DELETE":
      return await handleDelete(id, authUser);
    default:
      return createResponse(405, { message: "Método não permitido." });
  }
};

async function handleGet(
  id: string,
  authUser: any
): Promise<APIGatewayProxyResult> {
  try {
    // Por segurança, a rota GET /users/[id] geralmente retorna o perfil do próprio usuário logado
    const prisma = await getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { roles: true, currentRole: true },
    });

    if (!user)
      return createResponse(404, { message: "Utilizador não encontrado." });

    const { password, ...userWithoutPassword } = user;
    return createResponse(200, userWithoutPassword);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao buscar utilizador.",
      error: error.message,
    });
  }
}

async function handlePatch(
  id: string,
  authUser: any,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (authUser.id !== id && !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return createResponse(403, {
        message: "Você não tem permissão para editar este perfil.",
      });
    }

    if (!body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const data = JSON.parse(body);

    const isExMember = data.isExMember === "Sim";
    const validation = isExMember
      ? exMemberUpdateSchema.safeParse(data)
      : memberUpdateSchema.safeParse(data);
    if (!validation.success)
      return createResponse(400, {
        message: "Dados de atualização inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });

    const prisma = await getPrismaClient();
    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate)
      return createResponse(404, {
        message: "Utilizador a ser atualizado não encontrado.",
      });

    // Lógica de apagar imagem antiga do S3
    if (
      data.imageUrl &&
      userToUpdate.imageUrl &&
      data.imageUrl !== userToUpdate.imageUrl
    ) {
      const oldKey = userToUpdate.imageUrl.split("/").pop();
      if (oldKey)
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: oldKey,
          })
        );
    }

    // Preparação dos dados para Prisma e Cognito
    const validatedData = validation.data;

    const parsedBirthDate =
      typeof validatedData.birthDate === "string"
        ? parseBrazilianDate(validatedData.birthDate)
        : null;
    const updateData: Prisma.UserUpdateInput = {
      name: validatedData.name,
      email: validatedData.email,
      emailEJ: validatedData.emailEJ,
      birthDate: parsedBirthDate as Date, // Converte a string para um objeto Date
      phone: validatedData.phone,
      semesterEntryEj: validatedData.semesterEntryEj,
      course: validatedData.course,
      about: validatedData.about,
      instagram: validatedData.instagram,
      linkedin: validatedData.linkedin,
      isExMember, // Já é um booleano
      alumniDreamer: validatedData.alumniDreamer === "Sim",
    };

    if (validatedData.imageUrl) {
      updateData.imageUrl = validatedData.imageUrl;
    }
    if (validatedData.password)
      updateData.password = await bcrypt.hash(validatedData.password, 10);

    const attributesToUpdate = [];
    if (validatedData.name)
      attributesToUpdate.push({ Name: "name", Value: validatedData.name });
    if (validatedData.phone)
      attributesToUpdate.push({
        Name: "phone_number",
        Value: `+55${validatedData.phone.replace(/\D/g, "")}`,
      });

    // 3. Implementa a lógica de cargos de forma coerente com o schema
    if (isExMember) {
      const exMemberData = validatedData as ExMemberUpdateType;
      updateData.semesterLeaveEj = exMemberData.semesterLeaveEj;
      updateData.aboutEj = exMemberData.aboutEj;
      updateData.otherRole = exMemberData.otherRole;

      if (exMemberData.roles && exMemberData.roles.length > 0) {
        updateData.roles = {
          set: exMemberData.roles.map((id: any) => ({ id })),
        };
        // Ex-membros não têm um 'currentRole' ativo
        updateData.currentRole = { disconnect: true };
      }
    } else {
      // Lógica para Membros Ativos
      const memberData = validatedData as MemberUpdateType;
      updateData.isExMember = false;

      const uniqueRoleIds = new Set<string>();

      // 1. Adiciona o cargo ATUAL (obrigatório para membros ativos)
      if (memberData.roleId) {
        uniqueRoleIds.add(memberData.roleId);
        updateData.currentRole = { connect: { id: memberData.roleId } };

        // Atualiza o atributo customizado no Cognito com o cargo atual
        const currentRole = await prisma.role.findUnique({
          where: { id: memberData.roleId },
        });
        if (currentRole) {
          attributesToUpdate.push({
            Name: "custom:role",
            Value: currentRole.name,
          });
        }
      }

      // 2. Adiciona os cargos ANTERIORES (opcional)
      if (memberData.roles && Array.isArray(memberData.roles)) {
        memberData.roles.forEach((id: string) => uniqueRoleIds.add(id));
      }

      // 3. Define a lista completa de cargos para a relação
      updateData.roles = {
        set: Array.from(uniqueRoleIds).map((id) => ({ id })),
      };
    }

    // Executa as atualizações
    if (attributesToUpdate.length > 0) {
      await cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
          Username: userToUpdate.email, // Username no Cognito é o email
          UserAttributes: attributesToUpdate,
        })
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    const { password, ...userWithoutPassword } = updatedUser;
    return createResponse(200, userWithoutPassword);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao atualizar utilizador.",
      error: error.message,
    });
  }
}

async function handleDelete(
  id: string,
  authUser: any
): Promise<APIGatewayProxyResult> {
  try {
    if (!checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return createResponse(403, {
        message: "Apenas diretores podem apagar usuários.",
      });
    }

    const prisma = await getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user)
      return createResponse(404, { message: "Utilizador não encontrado." });

    // Transação para apagar do Cognito e do Prisma
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
        Username: user.email,
      })
    );
    await prisma.user.delete({ where: { id } });

    return createResponse(204, null);
  } catch (error: any) {
    return createResponse(500, {
      message: "Erro ao apagar utilizador.",
      error: error.message,
    });
  }
}
