import { constructMetadata } from "@/lib/metadata";
import PerfilContent from "../../_components/Dashboard/PerfilContent";
import { Role, User } from ".prisma/client";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";

export const metadata = constructMetadata({ title: "Perfil" });

// Tipagem para os dados da página
export interface PerfilPageData {
  user: (User & { roles: Role[] }) | null;
  roles: Role[] | null;
}

export const dynamic = "force-dynamic";

async function getUserPageData(id: string): Promise<PerfilPageData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };

    const [userResponse, rolesResponse] = await Promise.all([
      fetch(`${baseUrl}/api/users/${id}`, { headers, cache: "no-store" }),
      fetch(`${baseUrl}/api/roles`, { headers, cache: "no-store" }),
    ]);

    if (!userResponse.ok || !rolesResponse.ok) {
      throw new Error("Falha ao buscar os dados do perfil.");
    }

    const user = await userResponse.json();
    const roles = await rolesResponse.json();
    return { user, roles };
  } catch (error) {
    console.error("Erro em getUserPageData:", error);
    return { user: null, roles: null };
  }
}

const Page = async () => {
  const authUser = await getAuthenticatedUser();
  if (!authUser?.id) {
    return <div className="p-8 text-white">Usuário não autenticado.</div>;
  }

  const initialData = await getUserPageData(authUser.id);

  return (
    <div className="md:p-8 p-4">
      {/* Passamos todos os dados iniciais de uma vez */}
      <PerfilContent initialData={initialData} />
    </div>
  );
};

export default Page;
