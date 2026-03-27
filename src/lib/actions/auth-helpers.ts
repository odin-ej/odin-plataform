"use server";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { AreaRoles } from "@prisma/client";

export async function getLoginRedirectPath(): Promise<string> {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.currentRole) return "/";
    if (user.currentRole.area.includes(AreaRoles.TRAINEE)) return "/minhas-notas";
    return "/";
  } catch (error) {
    console.error("[auth-helpers] Failed to get redirect path:", error);
    return "/";
  }
}
