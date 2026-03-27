"use server";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { AreaRoles } from "@prisma/client";

export async function getLoginRedirectPath(): Promise<string> {
  const user = await getAuthenticatedUser();
  if (!user?.currentRole) return "/";
  if (user.currentRole.area.includes(AreaRoles.TRAINEE)) return "/minhas-notas";
  return "/";
}
