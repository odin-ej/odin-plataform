import { constructMetadata } from "@/lib/metadata";
import PerfilContent from "../../_components/Dashboard/usuarios/PerfilContent";
import { InterestCategory, ProfessionalInterest, Role, User, UserRoleHistory,  } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/utils";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";

export const metadata = constructMetadata({ title: "Perfil" });

export interface FullUserProfile extends User {
  professionalInterests: ProfessionalInterest[];
  roleHistory: (UserRoleHistory & { role: Role })[];
  roles: Role[];
  currentRole: Role;
}

// Tipagem para os dados da página
export interface PerfilPageData {
  user: FullUserProfile | null;
  roles: Role[] | null;
  interestCategories: (InterestCategory & { interests: ProfessionalInterest[] })[];
}

export const dynamic = "force-dynamic";

async function getUserPageData(id: string): Promise<PerfilPageData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };

    const profileDataResponse = await fetch(
      `${baseUrl}/api/users/${id}/profile-data`,
      { headers, cache: "no-store" }
    );

    if (!profileDataResponse.ok) {
      throw new Error("Falha ao buscar os dados do usuário.");
    }

    return profileDataResponse.json();
  } catch (error) {
    console.error("Erro em getUserPageData:", error);
    return { user: null, roles: null, interestCategories: [] };
  }
}

const Page = async () => {
  const authUser = await getAuthenticatedUser();
  if (!authUser?.id) {
    return <div className="p-8 text-white">Usuário não autenticado.</div>;
  }
  const hasPermission = verifyAccess({ pathname: "/perfil", user: authUser! });
  if (!hasPermission) return <DeniedAccess />;
  const initialData = await getUserPageData(authUser.id);

  return (
    <div className="md:p-8 p-4">
      {/* Passamos todos os dados iniciais de uma vez */}
      <PerfilContent initialData={initialData} />
    </div>
  );
};

export default Page;
