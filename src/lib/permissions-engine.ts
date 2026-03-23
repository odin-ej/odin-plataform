import { AreaRoles } from "@prisma/client";
import { ResolvedPolicy } from "./actions/permissions";

type UserForCheck = {
  isExMember: boolean;
  roles: Array<{
    id: string;
    area: AreaRoles[];
  }>;
};

/**
 * Verifica se um usuário satisfaz uma política resolvida.
 * Lógica: isPublic → passa. Ex-membro bloqueado → nega. 
 * Depois verifica se satisfaz ALGUMA regra (OR entre regras).
 * Dentro de cada regra: área OR cargo específico.
 */
export function checkPolicy(user: UserForCheck, policy: ResolvedPolicy): boolean {
  // Política pública: qualquer autenticado passa
  if (policy.isPublic) return true;

  // Ex-membros bloqueados se a política não permitir
  if (user.isExMember && !policy.allowExMembers) return false;

  // Sem regras definidas = apenas "membro ativo" é suficiente
  if (policy.rules.length === 0) return !user.isExMember;

  const userAreaSet = new Set(user.roles.flatMap((r) => r.area));
  const userRoleIdSet = new Set(user.roles.map((r) => r.id));

  // Basta satisfazer UMA regra
  return policy.rules.some((rule) => {
    const hasArea = rule.allowedAreas.some((a) => userAreaSet.has(a));
    const hasRole = rule.allowedRoleIds.some((id) => userRoleIdSet.has(id));
    return hasArea || hasRole;
  });
}

/**
 * Resolve o path para o mais específico disponível nas permissões.
 * Ex: "/salas-eaufba/reservar" → tenta "/salas-eaufba/reservar", 
 *     depois "/salas-eaufba", depois "/"
 */
export function resolvePathPolicy(
  path: string,
  routePermissions: Record<string, ResolvedPolicy>
): ResolvedPolicy | null {
  let current = path;
  while (current !== "/") {
    if (routePermissions[current]) return routePermissions[current];
    const lastSlash = current.lastIndexOf("/");
    current = lastSlash === 0 ? "/" : current.substring(0, lastSlash);
  }
  return routePermissions["/"] ?? null;
}