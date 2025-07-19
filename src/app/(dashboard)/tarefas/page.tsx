import TarefasContent from "@/app/_components/Dashboard/TarefasContent";
import { constructMetadata } from "@/lib/metadata";
import { getAssignableUsers } from "@/lib/permissions";
import { MemberWithRoles } from "@/lib/schemas/memberFormSchema";
import { FullTask } from "@/lib/schemas/projectsAreaSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";

interface TasksPageProps {
  tasks: FullTask[] | [];
  users: MemberWithRoles[] | [];
}

export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Tarefas" });

async function getPagesData(): Promise<TasksPageProps> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const [tasksRes, usersRes] = await Promise.all([
      fetch(`${baseUrl}/api/tasks`, {
        next: { revalidate: 45 },
        headers,
      }),
      fetch(`${baseUrl}/api/users`, {
        next: { revalidate: 45 },
        headers,
      }),
    ]);

    if (!tasksRes.ok || !usersRes.ok) {
      console.error("Falha ao buscar dados:", {
        tasks: tasksRes.status,
        users: usersRes.status,
      });
      throw new Error("Falha ao buscar dados da página.");
    }

    const tasks: FullTask[] = await tasksRes.json();
    const usersResult = await usersRes.json();
    const users: MemberWithRoles[] = usersResult.users.filter(
      (user: MemberWithRoles) => user.isExMember === false
    );
    return {
      tasks,
      users,
    };
  } catch (error) {
    console.error("Erro em getPageData:", error);
    return {
      tasks: [],
      users: [],
    };
  }
}

const Page = async () => {
  const { tasks, users } = await getPagesData();

  const authUser = await getAuthenticatedUser();
  if (!authUser) return;

  const verifiedUsers: MemberWithRoles[] = getAssignableUsers(authUser, users);

  const verifyIsMe = (user: MemberWithRoles) => user.id === authUser.id;

  const formatedUsers = verifiedUsers.map((user: MemberWithRoles) => ({
    value: user.id,
    label: verifyIsMe(user) ? "Eu" : user.name,
  }));

  return (
    <div className="sm:p-8 p-4">
      <TarefasContent tasks={tasks} users={formatedUsers} />
    </div>
  );
};

export default Page;
