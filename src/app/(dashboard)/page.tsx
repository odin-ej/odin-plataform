/* eslint-disable @typescript-eslint/no-explicit-any */
import { constructMetadata } from "@/lib/metadata";
import HomeContent from "../_components/Dashboard/HomeContent";
import { Goal, UsefulLink } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";

// Tipagem para os dados que a página e o componente cliente esperam
export interface HomeContentData {
  goals: Goal[];
  myPoints: number;
  numberOfTasks: number;
  usefulLinks: UsefulLink[];
}

export const metadata = constructMetadata({
  title: "Bem-vindo(a) ao Dashboard",
});
export const dynamic = "force-dynamic";

async function getPageData(): Promise<HomeContentData> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Usuário não autenticado");

    // Para ex-membros, retorna dados vazios para evitar chamadas de API desnecessárias
    if (authUser.isExMember) {
      return { goals: [], myPoints: 0, numberOfTasks: 0, usefulLinks: [] };
    }

    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };

    const [
      strategyResponse,
      myPointsResponse,
      numberOfTasksResponse,
      usefulLinksResponse,
    ] = await Promise.all([
      fetch(`${baseUrl}/api/house-goals`, { cache: "no-store", headers }),
      fetch(`${baseUrl}/api/my-points/${authUser.id}`, {
        cache: "no-store",
        headers,
      }),
      fetch(`${baseUrl}/api/my-tasks`, { cache: "no-store", headers }),
      fetch(`${baseUrl}/api/users/${authUser.id}/useful-links`, {
        cache: "no-store",
        headers,
      }),
    ]);

    // Processa cada resposta individualmente para maior resiliência
    const goals = strategyResponse.ok
      ? (await strategyResponse.json()).flatMap((obj: any) => obj.goals)
      : [];
    const myPointsData = myPointsResponse.ok
      ? await myPointsResponse.json()
      : { myPoints: { totalPoints: 0 } };
    const numberOfTasksData = numberOfTasksResponse.ok
      ? await numberOfTasksResponse.json()
      : [];
    const usefulLinksData = usefulLinksResponse.ok
      ? await usefulLinksResponse.json()
      : { links: [] };

    return {
      goals: goals,
      myPoints: myPointsData.myPoints?.totalPoints ?? 0,
      numberOfTasks: numberOfTasksData.length || 0,
      usefulLinks: usefulLinksData.links || [],
    };
  } catch (error) {
    console.error("Falha ao buscar dados do dashboard.", error);
    return { goals: [], myPoints: 0, numberOfTasks: 0, usefulLinks: [] };
  }
}

export default async function Home() {
  const initialData = await getPageData();

  return (
    <div className="md:p-8 p-4 h-full">
      <HomeContent initialData={initialData} />
    </div>
  );
}
