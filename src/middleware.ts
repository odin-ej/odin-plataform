import { fetchAuthSession } from "aws-amplify/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { runWithAmplifyServerContext } from "./lib/server-utils";

// Define as rotas que devem ser públicas (acessíveis sem login)
const publicRoutes = ["/login", "/registrar", "/esqueci-minha-senha"];

export async function middleware(request: NextRequest) {
  // Criamos uma resposta base que será usada se não houver redirecionamento
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

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

  // --- LÓGICA DE REDIRECIONAMENTO ---

  // 1. Se o usuário está autenticado e tenta acessar uma rota pública, redireciona para o dashboard.
  if (authenticated && publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Se o usuário NÃO está autenticado e tenta acessar uma rota protegida, redireciona para o login.
  if (!authenticated && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // --- LÓGICA DE HEADER 'x-next-pathname' ---
  
  // 3. Se NENHUM redirecionamento ocorreu, a requisição irá prosseguir.
  //    Este é o momento de adicionar o header para o Layout poder ler o pathname.
  
  // Clona os headers da requisição original para poder modificá-los
  const requestHeaders = new Headers(request.headers);
  
  // Adiciona o novo header 'x-next-pathname'
  requestHeaders.set('x-next-pathname', pathname);

  // Retorna a resposta para prosseguir, mas com os headers atualizados.
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Faz o match de todos os caminhos de pedido, exceto os que começam com:
     * - api (rotas de API)
     * - _next/static (ficheiros estáticos)
     * - _next/image (ficheiros de otimização de imagem)
     * - favicon.ico (o ficheiro do favicon)
     * - qualquer caminho que contenha um ponto (ex: sitemap.xml), o que é uma boa prática.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};