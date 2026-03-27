"use server";

import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { can } from "@/lib/actions/server-helpers";
import { AppAction } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import {
  createPolicySchema,
  PolicyFormValues,
  PolicyWithUsage,
  RoutePermissionItem,
  ActionPermissionItem,
  PolicySelectOption,
} from "@/lib/schemas/permissionSchema";

// ─── Helpers ─────────────────────────────────────────────────────────

async function requireDirector() {
  const authUser = await getAuthenticatedUser();
  if (!authUser || !await can(authUser, AppAction.MANAGE_PERMISSIONS)) {
    throw new Error("Não autorizado");
  }
  return authUser;
}

type ActionResult = { success: boolean; error?: string };

// ─── Políticas ───────────────────────────────────────────────────────

export async function getPoliciesWithUsage(): Promise<PolicyWithUsage[]> {
  await requireDirector();

  return prisma.permissionPolicy.findMany({
    orderBy: { name: "asc" },
    include: {
      rules: true,
      _count: {
        select: {
          routePermissions: true,
          actionPermissions: true,
        },
      },
    },
  });
}

export async function getPolicySelectOptions(): Promise<PolicySelectOption[]> {
  await requireDirector();

  return prisma.permissionPolicy.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function createPolicy(data: PolicyFormValues): Promise<ActionResult> {
  try {
    await requireDirector();

    const parsed = createPolicySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos" };
    }

    const { name, description, allowExMembers, isPublic, rules } = parsed.data;

    // Verificar nome duplicado
    const existing = await prisma.permissionPolicy.findUnique({ where: { name } });
    if (existing) {
      return { success: false, error: "Já existe uma política com este nome" };
    }

    await prisma.permissionPolicy.create({
      data: {
        name,
        description: description || null,
        allowExMembers,
        isPublic,
        isBuiltIn: false,
        rules: {
          create: rules.map((rule) => ({
            allowedAreas: rule.allowedAreas,
            allowedRoleIds: rule.allowedRoleIds,
          })),
        },
      },
    });

    revalidatePath("/gerenciar-permissoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar política:", error);
    return { success: false, error: "Erro interno ao criar política" };
  }
}

export async function updatePolicy(
  id: string,
  data: PolicyFormValues
): Promise<ActionResult> {
  try {
    await requireDirector();

    const parsed = createPolicySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Dados inválidos" };
    }

    const { name, description, allowExMembers, isPublic, rules } = parsed.data;

    // Verificar nome duplicado (excluindo o próprio)
    const existing = await prisma.permissionPolicy.findFirst({
      where: { name, NOT: { id } },
    });
    if (existing) {
      return { success: false, error: "Já existe uma política com este nome" };
    }

    await prisma.$transaction(async (tx) => {
      // Atualizar política
      await tx.permissionPolicy.update({
        where: { id },
        data: {
          name,
          description: description || null,
          allowExMembers,
          isPublic,
        },
      });

      // Recriar regras
      await tx.policyRule.deleteMany({ where: { policyId: id } });
      for (const rule of rules) {
        await tx.policyRule.create({
          data: {
            policyId: id,
            allowedAreas: rule.allowedAreas,
            allowedRoleIds: rule.allowedRoleIds,
          },
        });
      }
    });

    revalidatePath("/gerenciar-permissoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar política:", error);
    return { success: false, error: "Erro interno ao atualizar política" };
  }
}

export async function deletePolicy(id: string): Promise<ActionResult> {
  try {
    await requireDirector();

    const policy = await prisma.permissionPolicy.findUnique({
      where: { id },
      select: { isBuiltIn: true },
    });

    if (!policy) {
      return { success: false, error: "Política não encontrada" };
    }
    if (policy.isBuiltIn) {
      return { success: false, error: "Políticas built-in não podem ser deletadas" };
    }

    // Verificar se está em uso
    const usageCount = await prisma.routePermission.count({ where: { policyId: id } });
    const actionUsage = await prisma.actionPermission.count({ where: { policyId: id } });
    if (usageCount > 0 || actionUsage > 0) {
      return {
        success: false,
        error: `Política em uso por ${usageCount} rota(s) e ${actionUsage} ação(ões). Remova os vínculos primeiro.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.policyRule.deleteMany({ where: { policyId: id } });
      await tx.permissionPolicy.delete({ where: { id } });
    });

    revalidatePath("/gerenciar-permissoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar política:", error);
    return { success: false, error: "Erro interno ao deletar política" };
  }
}

// ─── Permissões de Rota ──────────────────────────────────────────────

export async function getRoutePermissionsList(): Promise<RoutePermissionItem[]> {
  await requireDirector();

  return prisma.routePermission.findMany({
    orderBy: { path: "asc" },
    include: {
      policy: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function updateRoutePolicy(
  id: string,
  policyId: string
): Promise<ActionResult> {
  try {
    await requireDirector();

    await prisma.routePermission.update({
      where: { id },
      data: { policyId },
    });

    revalidatePath("/gerenciar-permissoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar política da rota:", error);
    return { success: false, error: "Erro interno" };
  }
}

export async function toggleRouteActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await requireDirector();

    await prisma.routePermission.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/gerenciar-permissoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao alternar status da rota:", error);
    return { success: false, error: "Erro interno" };
  }
}

// ─── Permissões de Ação ──────────────────────────────────────────────

export async function getActionPermissionsList(): Promise<ActionPermissionItem[]> {
  await requireDirector();

  return prisma.actionPermission.findMany({
    orderBy: { actionKey: "asc" },
    include: {
      policy: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function updateActionPolicy(
  id: string,
  policyId: string
): Promise<ActionResult> {
  try {
    await requireDirector();

    await prisma.actionPermission.update({
      where: { id },
      data: { policyId },
    });

    revalidatePath("/gerenciar-permissoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar política da ação:", error);
    return { success: false, error: "Erro interno" };
  }
}

export async function toggleActionActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await requireDirector();

    await prisma.actionPermission.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/gerenciar-permissoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao alternar status da ação:", error);
    return { success: false, error: "Erro interno" };
  }
}
