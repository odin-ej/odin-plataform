import ManagePermissionsContent from "@/app/_components/Dashboard/gerenciar-permissoes/ManagePermissionsContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import {
  getPoliciesWithUsage,
  getRoutePermissionsList,
  getActionPermissionsList,
  getPolicySelectOptions,
} from "@/lib/actions/manage-permissions";
import { prisma } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = constructMetadata({ title: "Gerenciar Permissões" });

const Page = async () => {
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({ pathname: "/gerenciar-permissoes", user: user! });
  if (!hasPermission) return <DeniedAccess />;

  const [policies, routes, actions, policyOptions, roles] = await Promise.all([
    getPoliciesWithUsage(),
    getRoutePermissionsList(),
    getActionPermissionsList(),
    getPolicySelectOptions(),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, area: true },
    }),
  ]);

  return (
    <div className="md:p-8 p-4 overflow-x-auto">
      <ManagePermissionsContent
        initialPolicies={policies}
        initialRoutes={routes}
        initialActions={actions}
        policyOptions={policyOptions}
        roles={roles}
      />
    </div>
  );
};

export default Page;
