// Rota PATCH /api/users/update-password (PROTEGIDA POR SESSÃO)

import { prisma } from "@/db";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { runWithAmplifyServerContext } from "@/lib/server-utils";

// A função de servidor para obter o usuário autenticado
import { getCurrentUser } from "aws-amplify/auth/server";

export async function PATCH(request: Request) {
  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (context) => {
      try {
        // 1. (GATEKEEPER) A API verifica a sessão do usuário primeiro
        // Se não houver token ou for inválido, getCurrentUser lançará um erro
        // e a execução pulará para o bloco catch.
        const user = await getCurrentUser(context);

        const body = await request.clone().json();
        // A senha é a única coisa que precisamos do corpo da requisição agora
        const { password } = body;

        if (!password) {
          return NextResponse.json(
            { message: "A nova senha é obrigatória." },
            { status: 400 }
          );
        }

        // 2. Se chegamos aqui, o usuário está autenticado.
        // Podemos usar o e-mail do token para garantir que estamos atualizando o usuário certo.
        const emailDoToken = user.signInDetails?.loginId;
        if (!emailDoToken) {
          throw new Error(
            "Não foi possível identificar o e-mail do usuário no token."
          );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
          where: { email: emailDoToken },
          data: { password: hashedPassword },
        });

        return NextResponse.json(
          { message: "Senha sincronizada com sucesso" },
          { status: 200 }
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("ERRO NA ROTA PROTEGIDA:", error);
        // O erro mais comum aqui será de autenticação
        return NextResponse.json(
          { message: "Não autorizado." },
          { status: 401 }
        );
      }
    },
  });
}
