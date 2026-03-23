import UsersContent from "@/app/_components/Dashboard/usuarios/UsersContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { getInterestCategories } from "@/lib/actions/user";
import { constructMetadata } from "@/lib/metadata";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { Role } from "@prisma/client";
import { cookies } from "next/headers";

interface UsersPageData {
  users: MemberWithFullRoles[] | null;
  roles: Role[] | null;
}

export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Usuários" });

async function getUserPageData(): Promise<UsersPageData> {
  try {
    // A URL base da sua aplicação. Em produção, use uma variável de ambiente.
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // A função `cookies()` do Next.js nos dá acesso aos cookies do pedido.
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    // Faz as chamadas à API em paralelo, encaminhando os cookies.
    const [userResponse, rolesResponse] = await Promise.all([
      fetch(`${baseUrl}/api/users/`, {
        // Uma nova rota segura para buscar o utilizador logado
        next: { revalidate: 45 },
        headers,
      }),
      fetch(`${baseUrl}/api/roles`, {
        // A rota de cargos pode continuar pública ou ser protegida
        next: { revalidate: 45 },
        headers,
      }),
    ]);

    if (!userResponse.ok || !rolesResponse.ok) {
      console.error("Falha ao buscar dados do perfil. Status:", {
        user: userResponse.status,
        roles: rolesResponse.status,
      });
      return {
        users: null,
        roles: null,
      };
    }

    const userJson = await userResponse.json();
    const users = userJson.users; // <-- aqui estava o erro!
    const roles = await rolesResponse.json();

    return { users, roles };
  } catch (error) {
    console.error("Erro em getUserPageData:", error);
    return {
      users: null,
      roles: null,
    };
  }
}

const Page = async () => {
  const { users, roles } = await getUserPageData();
  const members = users!.filter(
    (user: MemberWithFullRoles) => user.isExMember === true
  );
  const exMembers = users!.filter(
    (user: MemberWithFullRoles) => user.isExMember === false
  );

  const authUser = await getAuthenticatedUser();
  if (!authUser) return <div>Não autenticado</div>;
  const hasPermission = verifyAccess({ pathname: "/usuarios", user: authUser });
  if (!hasPermission) return <DeniedAccess />;

  const interestCategories = await getInterestCategories()

  return (
    <div className="md:p-8 p-4">
      <UsersContent
        exMembers={members}
        members={exMembers}
        availableRoles={roles!}
        interestCategories={interestCategories}
      />
    </div>
  );
};

export default Page;
