import PendenciesContent from "@/app/_components/Dashboard/PendenciesContent";
import { FullTask } from "@/lib/schemas/projectsAreaSchema";
import { cookies } from "next/headers";

interface MyPendenciesPageProps {
  myTasks: FullTask[];
}

export const dynamic = "force-dynamic";

async function getPageData(): Promise<MyPendenciesPageProps> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const cookiesStore = await cookies();
        const headers = { Cookie: cookiesStore.toString() };
    const response = await fetch(`${baseUrl}/api/tasks`, {
      next: { revalidate: 45 },
      headers,
    });
    const myTasks = await response.json();
    return { myTasks };
  } catch (error) {
    console.error("Falha ao buscar os dados da página.", error);
    return { myTasks: [] };
  }
}

const Page = async () => {
  const { myTasks } = await getPageData();

  return (
    <div className="p-4 sm:p-8">
      <PendenciesContent myTasks={myTasks} />
    </div>
  );
};

export default Page;
