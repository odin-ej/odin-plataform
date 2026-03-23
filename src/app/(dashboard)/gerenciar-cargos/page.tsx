import RolesContent from "@/app/_components/Dashboard/gerenciar-cargos/RolesContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { Prisma, Role } from "@prisma/client";
import { cookies } from "next/headers";

export interface RolesManagementPageProps {
  roles: Role[];
  users: MemberWithFullRoles[];
  interestCategories: Prisma.InterestCategoryGetPayload<{
    include: {
      _count: {
        select: {
          interests: true;
        };
      }
    }
  }>[];
  professionalInterests: Prisma.ProfessionalInterestGetPayload<{
    include: {
      category: true;
    }
  }>[];
}

export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Gerenciar Cargos" });

async function getPageData(): Promise<RolesManagementPageProps> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const response = await fetch(`${baseUrl}/api/managment-roles`, {
      headers
    })
    
    if(!response.ok) throw new Error("Falha ao buscar os cargos no servidor.");
    const responseJson = await response.json();
    return responseJson;

  } catch (error) {
    console.error("Erro em getPageData:", error);
    return { roles: [], users: [], interestCategories: [], professionalInterests: [] };
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
