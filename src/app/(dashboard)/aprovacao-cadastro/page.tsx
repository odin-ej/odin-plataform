import UsersContent from "@/app/_components/Dashboard/UsersContent";
import { constructMetadata } from "@/lib/metadata";
import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { RegistrationRequestWithRoles } from "@/lib/schemas/memberFormSchema";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";

export const metadata = constructMetadata({ title: "Aprovação de Cadastro" });

export const dynamic = "force-dynamic";

// Combinamos as duas buscas em uma única função para organização
async function getPageData() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const cookiesStore = await cookies();
  const headers = { Cookie: cookiesStore.toString() };

  try {
    const [requestsRes, rolesRes] = await Promise.all([
      fetch(`${baseUrl}/api/registration-requests`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${baseUrl}/api/roles`, { cache: "no-store" }),
    ]);

    if (!requestsRes.ok || !rolesRes.ok) {
      console.error("Falha ao buscar dados no servidor");
      return { requests: [], roles: [] };
    }

    const requestsData = await requestsRes.json();
    const rolesData = await rolesRes.json();

    return {
      requests: requestsData.requests as RegistrationRequestWithRoles[],
      roles: rolesData as Role[],
    };
  } catch (error) {
    console.error("Erro em getPageData:", error);
    return { requests: [], roles: [] };
  }
}

const Page = async () => {
  // Busca os dados iniciais
  const initialData = await getPageData();
    const user = await getAuthenticatedUser();
    const hasPermission = verifyAccess({ pathname: "/aprovacao-cadastro", user: user! });
    if (!hasPermission) return <DeniedAccess />;
  // A lógica de filtro agora vai para o componente cliente.
  // A página do servidor apenas entrega os dados brutos.
  const members = initialData.requests.filter(
    (request) => request.isExMember === false
  );

  const exMembers = initialData.requests.filter(
    (request) => request.isExMember === true
  );

  return (
    <div className="md:p-8 p-4 w-full">
      <UsersContent
        type="approve"
        availableRoles={initialData.roles}
        members={members}
        exMembers={exMembers}
      />
    </div>
  );
};

export default Page;
