import { APIGatewayProxyEvent } from "aws-lambda";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { prisma } from "./db.js"; // Usando a mesma instância do Prisma
import { FullUser } from "./schemas.js"; // Tipos compartilhados

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: "access", // ou "id", dependendo do token que seu frontend envia
  clientId: process.env.COGNITO_USER_POOL_CLIENT_ID!,
});

/**
 * Obtém o usuário autenticado a partir do cabeçalho de autorização de um evento do API Gateway
 * e enriquece os dados com as informações do banco de dados Prisma.
 * @param {APIGatewayProxyEvent} event O evento do API Gateway.
 * @returns {Promise<FullUser | null>} O objeto completo do usuário ou nulo.
 */
export async function getAuthenticatedUserFromEvent(
  event: APIGatewayProxyEvent
): Promise<FullUser | null> {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) {
    console.log("Cabeçalho de autorização ausente.");
    return null;
  }

  try {
    const token = authHeader.split(" ")[1]; // Extrai o token "Bearer <token>"
    const payload = await verifier.verify(token);

    const userId = payload.sub; // 'sub' é o ID do usuário no Cognito
    if (!userId) {
      return null;
    }

    const prismaUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true, currentRole: true },
    });

    if (!prismaUser || !prismaUser.currentRole) {
      console.warn(
        `Usuário autenticado com ID ${userId} não encontrado no banco ou sem cargo atual.`
      );
      return null;
    }

    return prismaUser as FullUser;
  } catch (error) {
    console.error("Erro de autenticação ou verificação de token:", error);
    return null;
  }
}
