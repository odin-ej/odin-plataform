import { z } from "zod";
import { AreaRoles } from "@prisma/client";
import { Prisma } from "@prisma/client";

// ─── Schema para criar/editar política ───────────────────────────────

const policyRuleSchema = z.object({
  allowedAreas: z.array(z.nativeEnum(AreaRoles)),
  allowedRoleIds: z.array(z.string()),
});

export const createPolicySchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  allowExMembers: z.boolean(),
  isPublic: z.boolean(),
  rules: z.array(policyRuleSchema),
});

export type PolicyFormValues = z.infer<typeof createPolicySchema>;
export type PolicyRuleFormValues = z.infer<typeof policyRuleSchema>;

// ─── Types para listagem ─────────────────────────────────────────────

export type PolicyWithUsage = Prisma.PermissionPolicyGetPayload<{
  include: {
    rules: true;
    _count: {
      select: {
        routePermissions: true;
        actionPermissions: true;
      };
    };
  };
}>;

export type RoutePermissionItem = Prisma.RoutePermissionGetPayload<{
  include: {
    policy: {
      select: { id: true; name: true };
    };
  };
}>;

export type ActionPermissionItem = Prisma.ActionPermissionGetPayload<{
  include: {
    policy: {
      select: { id: true; name: true };
    };
  };
}>;

export type PolicySelectOption = {
  id: string;
  name: string;
};
