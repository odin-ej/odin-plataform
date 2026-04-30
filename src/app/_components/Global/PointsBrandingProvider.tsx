"use client";

/**
 * PointsBrandingProvider
 *
 * Proposito:
 *   Disponibilizar, via React Context, o "branding" atual do sistema de
 *   pontuacao (JR Points classico ou Fecs Week Game) para qualquer
 *   componente da arvore filha.
 *
 * Por que Context (e nao prop drilling):
 *   O branding precisa chegar em ~9 componentes (pagina geral, meus pontos,
 *   gerenciar, board de solicitacoes, cards, modais e painel administrativo).
 *   Empurrar o objeto `branding` por props seria invasivo e ruidoso. Com
 *   Context, cada componente que precisa apenas chama `usePointsBranding()`.
 *
 * Comportamento padrao:
 *   - Sem Provider acima na arvore, `usePointsBranding()` retorna
 *     `JR_POINTS_BRANDING`. Isso garante que as rotas existentes
 *     (`/jr-points`, `/meus-pontos`, `/gerenciar-jr-points`) continuem
 *     funcionando exatamente como antes.
 *   - As paginas wrapper de `/fecs-week-game/*` envelopam o conteudo em
 *     `<PointsBrandingProvider value={FECS_WEEK_BRANDING}>` para aplicar o
 *     rebrand do evento.
 *
 * Dependencias:
 *   - `PointsBranding`, `JR_POINTS_BRANDING` definidos em `src/lib/branding.ts`.
 */

import { createContext, ReactNode, useContext } from "react";
import { JR_POINTS_BRANDING, PointsBranding } from "@/lib/branding";

/**
 * Context interno usado para distribuir o branding na arvore de componentes.
 * Nao exportado: a API publica e via `usePointsBranding`.
 */
const PointsBrandingContext = createContext<PointsBranding>(JR_POINTS_BRANDING);

/**
 * Provider que injeta um conjunto de branding em sua subarvore.
 *
 * @param value     Objeto de branding a ser disponibilizado (ex.: `FECS_WEEK_BRANDING`).
 * @param children  Conteudo (paginas/componentes) que consomem o branding.
 *
 * @example
 *   <PointsBrandingProvider value={FECS_WEEK_BRANDING}>
 *     <JrPointsContent initialData={data} />
 *   </PointsBrandingProvider>
 */
export function PointsBrandingProvider({
  value,
  children,
}: {
  value: PointsBranding;
  children: ReactNode;
}) {
  return (
    <PointsBrandingContext.Provider value={value}>
      {children}
    </PointsBrandingContext.Provider>
  );
}

/**
 * Hook que retorna o branding atual da arvore.
 *
 * @returns O objeto `PointsBranding` mais proximo (ou
 *   `JR_POINTS_BRANDING` como default, quando nao ha Provider).
 *
 * @example
 *   const branding = usePointsBranding();
 *   return <h1>{branding.systemName}</h1>;
 */
export function usePointsBranding(): PointsBranding {
  return useContext(PointsBrandingContext);
}
