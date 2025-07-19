import { fetchAuthSession } from "aws-amplify/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { runWithAmplifyServerContext } from "./lib/server-utils";

// Define as rotas que devem ser públicas (acessíveis sem login)
const publicRoutes = ["/login", "/registrar", "/esqueci-minha-senha"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Executa a verificação de autenticação no contexto do servidor
  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec);
        return (
          session.tokens?.accessToken !== undefined &&
          session.tokens?.idToken !== undefined
        );
      } catch (error) {
        console.log("Middleware Auth Error:", error);
        return false;
      }
    },
  });

  // --- LÓGICA DE REDIRECIONAMENTO CORRIGIDA ---

  // 1. Se o utilizador está autenticado...
  if (authenticated) {
    // ... e tenta aceder a uma rota pública (login/registrar), redireciona-o para o dashboard.
    if (publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL("/", request.url)); // Redireciona para a página inicial/dashboard
    }
    // Se não, permite que ele aceda a qualquer outra página protegida.
    return response;
  }

  // 2. Se o utilizador NÃO está autenticado...
  if (!authenticated) {
    // ... e tenta aceder a uma rota protegida, redireciona-o para o login.
    if (!publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Se ele já está a tentar aceder a uma rota pública, permite.

    return response;
  }

  // Por padrão, permite a navegação.
  return response;
}

export const config = {
  matcher: [
    /*
     * Faz o match de todos os caminhos de pedido, exceto os que começam com:
     * - api (rotas de API)
     * - _next/static (ficheiros estáticos)
     * - _next/image (ficheiros de otimização de imagem)
     * - favicon.ico (o ficheiro do favicon)
     *
     * CORREÇÃO: O matcher agora é mais simples e permite que a lógica do middleware
     * lide com as rotas públicas e privadas.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
