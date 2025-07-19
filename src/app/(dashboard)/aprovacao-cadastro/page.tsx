import UsersContent from "@/app/_components/Dashboard/UsersContent";
import { constructMetadata } from "@/lib/metadata";
import { RegistrationRequest, Role } from ".prisma/client";
import { RegistrationRequestWithRoles } from "@/lib/schemas/memberFormSchema";
import { cookies } from "next/headers";

export const metadata = constructMetadata({ title: "Aprovação de Cadastro" });

interface RequestsPageData {
  requests: RegistrationRequestWithRoles[];
  roles: Role[];
}

export const dynamic = "force-dynamic";

async function getRequestsData(): Promise<Omit<RequestsPageData, "roles">> {
  try {
    // Em produção, use uma variável de ambiente para o URL base da sua aplicação.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    // Faz uma única chamada à sua API agregadora.
    const response = await fetch(`${baseUrl}/api/registration-requests`, {
      next: { revalidate: 45 }, 
      headers// Garante que os dados estão sempre atualizados a cada visita.
    });

    if (!response.ok) {
      throw new Error(
        `Falha ao buscar os dados da página. Status: ${response.status}`
      );
    }
    const requestsJson = await response.json();

    return { requests: requestsJson.requests };
  } catch (error) {
    console.error("Erro em getPageData:", error);
    // Retorna dados vazios em caso de erro para não quebrar a página.
    return {
      requests: [],
    };
  }
}

async function getRolesData(): Promise<Pick<RequestsPageData, "roles">> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/roles`, {
      next: { revalidate: 45 },
    });

    if (!response.ok) {
      throw new Error("Falha ao buscar os cargos no servidor.");
    }

    const rolesJson = await response.json();
    return { roles: rolesJson };
  } catch (error) {
    console.error("Erro em getPageData:", error);
    return { roles: [] };
  }
}

const Page = async () => {
  const { roles } = await getRolesData();
  const { requests } = await getRequestsData();
  const members = requests.filter(
    (user: RegistrationRequest) => user.isExMember === false
  );

  const exMembers = requests.filter(
    (user: RegistrationRequest) => user.isExMember === true
  );
  return (
    <div className="md:p-8 p-4 w-full">
      <UsersContent
        type="approve"
        availableRoles={roles}
        exMembers={exMembers}
        members={members}
      />
    </div>
  );
};

export default Page;
