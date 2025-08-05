import RolesContent from "@/app/_components/Dashboard/RolesContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { Role } from "@prisma/client";

export interface RolesManagementPageProps {
  roles: Role[];
  users: MemberWithFullRoles[];
}

export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Gerenciar Cargos" });

async function getPageData(): Promise<RolesManagementPageProps> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const [rolesResponse, usersResponse] = await Promise.all([
      fetch(`${baseUrl}/api/roles`, {
        cache: "no-store",
      }),
      fetch(`${baseUrl}/api/users`, {
        cache: "no-store",
      }),
    ]);
    if (!rolesResponse.ok || !usersResponse.ok) {
      throw new Error("Falha ao buscar os cargos ou usuários no servidor.");
    }
    const rolesJson = await rolesResponse.json();
    const usersData = await usersResponse.json();
    const usersJson = usersData.users;
    return { roles: rolesJson, users: usersJson };
  } catch (error) {
    console.error("Erro em getPageData:", error);
    return { roles: [], users: [] };
  }
}

const Page = async () => {
  const initialData = await getPageData();
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({
    pathname: "/gerenciar-cargos",
    user: user!,
  });
  if (!hasPermission) return <DeniedAccess />;
  return (
    <div className="sm:p-8 p-4">
      <RolesContent initialData={initialData} />
    </div>
  );
};

export default Page;
