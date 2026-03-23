'use server'

import { AppAction } from "../permissions";
import { resolvePathPolicy, checkPolicy } from "../permissions-engine";
import { getAllRoutePermissions, getAllActionPermissions } from "./permissions";


type UserForCheck = {
  isExMember: boolean;
  roles: Array<{ id: string; area: import("@prisma/client").AreaRoles[] }>;
};

/**
 * Verifica acesso a uma rota. Use no middleware ou em Server Components.
 */
export async function canAccessRoute(user: UserForCheck, path: string): Promise<boolean> {
  const routePermissions = await getAllRoutePermissions();
  const policy = resolvePathPolicy(path, routePermissions);
  if (!policy) return false;
  return checkPolicy(user, policy);
}

/**
 * Verifica se o usuário pode executar uma ação específica.
 * 
 * @example
 * const canManage = await can(user, AppAction.MANAGE_ROOM_RESERVATIONS);
 */
export async function can(user: UserForCheck, action: AppAction): Promise<boolean> {
  const actionPermissions = await getAllActionPermissions();
  const policy = actionPermissions[action];
  if (!policy) return false; // Ação não configurada = negado por padrão
  return checkPolicy(user, policy);
}

/**
 * Retorna todas as ações que o usuário pode executar.
 * Útil para passar ao client via props.
 */
export async function getUserAllowedActions(user: UserForCheck): Promise<AppAction[]> {
  const actionPermissions = await getAllActionPermissions();
  const allowed: AppAction[] = [];

  for (const [key, policy] of Object.entries(actionPermissions)) {
    if (checkPolicy(user, policy)) {
      allowed.push(key as AppAction);
    }
  }

  return allowed;
}