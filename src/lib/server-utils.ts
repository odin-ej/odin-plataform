// lib/server-utils.ts
import { cookies } from "next/headers";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth/server";
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { Role, User } from "@prisma/client";
import { prisma } from "@/db";

export const { runWithAmplifyServerContext } = createServerRunner({
  config: {
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID as string,
        userPoolClientId: process.env
          .NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID as string,
      },
    },
  },
});

export type FullUser = User & { roles: Role[]; currentRole: Role };

/**
 * Obtém o usuário autenticado no contexto do servidor e enriquece
 * os dados com as informações do banco de dados Prisma (cargos, etc.).
 * @returns {Promise<FullUser | null>} O objeto completo do usuário ou nulo se não estiver autenticado/encontrado.
 */
export async function getAuthenticatedUser(): Promise<FullUser | null> {
  try {
    // 1. Obtém o usuário básico do Amplify para pegar o ID
    const amplifyUser = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        // Garante que a sessão está válida antes de buscar o usuário
        await fetchAuthSession(contextSpec);
        return getCurrentUser(contextSpec);
      },
    });

    // Se não houver usuário no Amplify, retorna nulo
    if (!amplifyUser?.userId) {
      return null;
    }

    // 2. Usa o ID do Amplify (sub) para buscar o usuário completo no Prisma
    // O 'userId' do Amplify geralmente corresponde ao 'id' (sub) no seu banco de dados.
    const prismaUser = await prisma.user.findUnique({
      where: {
        id: amplifyUser.userId,
      },
      include: {
        // Inclui a relação com os cargos (roles) na busca
        roles: true,
        currentRole: true,
      },
    });

    // Se o usuário não for encontrado no Prisma, retorna nulo
    if (!prismaUser || !prismaUser.currentRole) {
      console.warn(
        `Usuário autenticado com ID ${amplifyUser.userId} não encontrado no banco de dados ou não possui um cargo atual (currentRole).`
      );
      return null;
    }

    // 3. Retorna o usuário completo do Prisma
    return prismaUser as FullUser;
  } catch (error) {
    // Em caso de erro (ex: sessão expirada), o Amplify lança uma exceção.
    // Retornamos nulo para indicar que não há um usuário autenticado.
    console.error("Sessão não encontrada ou erro ao obter usuário:", error);
    return null;
  }
}

export async function getConversationHistory(conversationId: string) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  return messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));
}
