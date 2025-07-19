import { constructMetadata } from "@/lib/metadata";
import PerfilContent from "../../_components/Dashboard/PerfilContent";
import { Role, User } from ".prisma/client";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";

export const metadata = constructMetadata({ title: "Perfil" });

interface PerfilPageProps {
  roles: Role[] | null;
  user: (User & { roles: Role[] }) | null;
}

export const dynamic = "force-dynamic";

async function getUserPageData(id: string): Promise<PerfilPageProps> {
  try {
    // A URL base da sua aplicação. Em produção, use uma variável de ambiente.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    // A função `cookies()` do Next.js nos dá acesso aos cookies do pedido.

    // Faz as chamadas à API em paralelo, encaminhando os cookies.
    const [userResponse, rolesResponse] = await Promise.all([
      fetch(`${baseUrl}/api/users/${id}`, {
        // Uma nova rota segura para buscar o utilizador logado
        headers,
        next: { revalidate: 45 },
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
        user: null,
        roles: null,
      };
    }

    const user = await userResponse.json();
    const roles = await rolesResponse.json();

    return { user, roles };
  } catch (error) {
    console.error("Erro em getUserPageData:", error);
    return {
      user: null,
      roles: null,
    };
  }
}

const Page = async () => {
  const authUser = await getAuthenticatedUser();
  const { user, roles } = await getUserPageData(authUser!.id);
  return (
    <div className="md:p-8 p-4">
      <PerfilContent user={user!} roles={roles!} />
    </div>
  );
};

export default Page;
