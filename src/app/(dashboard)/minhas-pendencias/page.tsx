import PendenciesContent from "@/app/_components/Dashboard/tarefas/PendenciesContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { MemberWithRoles } from "@/lib/schemas/memberFormSchema";
import { FullTask } from "@/lib/schemas/projectsAreaSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { cookies } from "next/headers";

// Tipagem para os dados da página
export interface MyPendenciesPageData {
  myTasks: FullTask[];
  allUsers: MemberWithRoles[];
}

export const metadata = constructMetadata({ title: "Minhas Pendências" });

export const dynamic = "force-dynamic";

async function getPageData(): Promise<MyPendenciesPageData> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const cookiesStore = await cookies();
  const headers = { Cookie: cookiesStore.toString() };
  try {
    // Fazemos as duas chamadas em paralelo para mais performance
    const [tasksResponse, usersResponse] = await Promise.all([
      fetch(`${baseUrl}/api/tasks`, { cache: "no-store", headers }),
      fetch(`${baseUrl}/api/users`, { cache: "no-store", headers }), // Busca todos os usuários
    ]);

    if (!tasksResponse.ok || !usersResponse.ok) {
      throw new Error("Falha ao buscar os dados da página.");
    }

    const myTasks = await tasksResponse.json();
    const usersJson = await usersResponse.json();

    return { myTasks, allUsers: usersJson.users };
  } catch (error) {
    console.error("Falha ao buscar os dados da página.", error);
    return { myTasks: [], allUsers: [] };
  }
}

const Page = async () => {
  const initialData = await getPageData();
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({
    pathname: "/minhas-pendencias",
    user: user!,
  });
  if (!hasPermission) return <DeniedAccess />;
  return (
    <div className="p-4 sm:p-8">
      <PendenciesContent initialData={initialData} />
    </div>
  );
};

export default Page;
