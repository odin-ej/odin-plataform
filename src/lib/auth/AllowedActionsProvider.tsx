"use client";

/**
 * AllowedActionsProvider
 *
 * Distribui para a arvore client a lista de:
 *   - acoes (AppAction[]) que o usuario pode executar
 *   - rotas (string[]) que o usuario pode acessar
 *
 * Ambas sao calculadas no server (em src/app/(dashboard)/layout.tsx) lendo
 * as policies do banco. Manter as duas listas no mesmo provider evita
 * prop drilling e duas roundtrips de Context para a mesma feature de
 * permissoes dinamicas.
 *
 * Como usar:
 *   const { canDo, canAccess } = useAllowedActions();
 *   if (canDo(AppAction.MANAGE_USERS)) ...
 *   if (canAccess("/gerenciar-permissoes")) ...
 */

import { createContext, useContext, ReactNode } from "react";
import { AppAction } from "@/lib/permissions";

interface AllowedActionsContextType {
  /** Acoes (AppAction) que o usuario pode executar. */
  allowedActions: string[];
  /** Paths de rotas que o usuario pode acessar (vindo de RoutePermission). */
  allowedRoutes: string[];
  /** Verifica se uma acao especifica esta permitida. */
  canDo: (action: AppAction) => boolean;
  /**
   * Verifica se um path esta permitido.
   *
   * Faz match exato e tambem fallback hierarquico (ex.: `/areas/operacoes/painel`
   * passa se `/areas/operacoes/painel`, `/areas/operacoes` ou `/areas` estiver
   * permitido). Espelha a logica de `resolvePathPolicy` no server.
   */
  canAccess: (href: string) => boolean;
}

const AllowedActionsContext = createContext<AllowedActionsContextType>({
  allowedActions: [],
  allowedRoutes: [],
  canDo: () => false,
  canAccess: () => false,
});

export function AllowedActionsProvider({
  children,
  allowedActions,
  allowedRoutes,
}: {
  children: ReactNode;
  allowedActions: string[];
  allowedRoutes: string[];
}) {
  const allowedRouteSet = new Set(allowedRoutes);

  const canDo = (action: AppAction) => allowedActions.includes(action);

  const canAccess = (href: string) => {
    // Match exato primeiro (caminho mais especifico tem precedencia).
    if (allowedRouteSet.has(href)) return true;

    // Fallback hierarquico: subir na arvore de path ate achar uma rota cadastrada.
    let current = href;
    while (current !== "/") {
      const lastSlash = current.lastIndexOf("/");
      current = lastSlash === 0 ? "/" : current.substring(0, lastSlash);
      if (allowedRouteSet.has(current)) return true;
    }
    return false;
  };

  return (
    <AllowedActionsContext.Provider
      value={{ allowedActions, allowedRoutes, canDo, canAccess }}
    >
      {children}
    </AllowedActionsContext.Provider>
  );
}

export function useAllowedActions() {
  return useContext(AllowedActionsContext);
}
