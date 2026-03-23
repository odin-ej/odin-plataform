// lib/permissions/use-permission.ts (client-side)
"use client";
import { AppAction } from "@/lib/permissions";
import { useCallback } from "react";

// Você passa as permissões resolvidas via props/context do servidor
type ClientPermissions = {
  allowedActions: AppAction[];
  allowedRoutes: string[];
};

export function usePermission(permissions: ClientPermissions) {
  const can = useCallback(
    (action: AppAction) => permissions.allowedActions.includes(action),
    [permissions]
  );

  const canAccess = useCallback(
    (route: string) => permissions.allowedRoutes.includes(route),
    [permissions]
  );

  return { can, canAccess };
}