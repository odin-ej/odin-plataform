import TarefasContent from "@/app/_components/Dashboard/TarefasContent";
import { constructMetadata } from "@/lib/metadata";
import { getAssignableUsers } from "@/lib/permissions";
import { MemberWithRoles } from "@/lib/schemas/memberFormSchema";
import { FullTask } from "@/lib/schemas/projectsAreaSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";

// Tipagem para os dados da página
export interface TasksPageData {
  tasks: FullTask[];
  formatedUsers: { value: string; label: string }[];
}

export const dynamic = "force-dynamic";
export const metadata = constructMetadata({ title: "Tarefas" });

async function getPagesData(): Promise<
  Omit<TasksPageData, "formatedUsers"> & { users: MemberWithRoles[] }
> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const [tasksRes, usersRes] = await Promise.all([
      fetch(`${baseUrl}/api/tasks`, { cache: "no-store", headers }),
      fetch(`${baseUrl}/api/users`, { cache: "no-store", headers }),
    ]);

    if (!tasksRes.ok || !usersRes.ok)
      throw new Error("Falha ao buscar dados da página.");

    const tasks: FullTask[] = await tasksRes.json();
    const usersResult = await usersRes.json();
    const users: MemberWithRoles[] = usersResult.users.filter(
      (u: MemberWithRoles) => !u.isExMember
    );
    return { tasks, users };
  } catch (error) {
    console.error("Erro em getPageData:", error);
    return { tasks: [], users: [] };
  }
}

const Page = async () => {
  const { tasks, users } = await getPagesData();
  const authUser = await getAuthenticatedUser();
  if (!authUser) return <div>Não autenticado</div>;

  const verifiedUsers: MemberWithRoles[] = getAssignableUsers(authUser, users);
  const verifyIsMe = (user: MemberWithRoles) => user.id === authUser.id;
  const formatedUsers = verifiedUsers.map((user: MemberWithRoles) => ({
    value: user.id,
    label: verifyIsMe(user) ? "Eu" : user.name,
  }));
  
  const initialData: TasksPageData = { tasks, formatedUsers };

  return (
    <div className="sm:p-8 p-4">
      <TarefasContent initialData={initialData} />
    </div>
  );
};

export default Page;
