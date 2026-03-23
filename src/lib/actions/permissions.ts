'use server'
import { prisma } from "@/db";
import { AreaRoles } from "@prisma/client";
import { cache } from "react"; // React cache para deduplicação por request

// Tipo resolvido de uma política com suas regras
export type ResolvedPolicy = {
  allowExMembers: boolean;
  isPublic: boolean;
  rules: Array<{
    allowedAreas: AreaRoles[];
    allowedRoleIds: string[];
  }>;
};

/**
 * Carrega TODAS as políticas de rota de uma vez (1 query por request).
 * O `cache()` do React garante que múltiplos usos na mesma request não re-executam.
 */
export const getAllRoutePermissions = cache(async (): Promise<
  Record<string, ResolvedPolicy>
> => {
  const routes = await prisma.routePermission.findMany({
    where: { isActive: true },
    include: {
      policy: {
        include: { rules: true },
      },
    },
  });

  return Object.fromEntries(
    routes.map((r) => [
      r.path,
      {
        allowExMembers: r.policy.allowExMembers,
        isPublic: r.policy.isPublic,
        rules: r.policy.rules.map((rule) => ({
          allowedAreas: rule.allowedAreas,
          allowedRoleIds: rule.allowedRoleIds,
        })),
      },
    ])
  );
});

/**
 * Carrega todas as permissões de ação de uma vez.
 */
export const getAllActionPermissions = cache(async (): Promise<
  Record<string, ResolvedPolicy>
> => {
  const actions = await prisma.actionPermission.findMany({
    where: { isActive: true },
    include: {
      policy: {
        include: { rules: true },
      },
    },
  });

  return Object.fromEntries(
    actions.map((a) => [
      a.actionKey,
      {
        allowExMembers: a.policy.allowExMembers,
        isPublic: a.policy.isPublic,
        rules: a.policy.rules.map((rule) => ({
          allowedAreas: rule.allowedAreas,
          allowedRoleIds: rule.allowedRoleIds,
        })),
      },
    ])
  );
});