/* eslint-disable @typescript-eslint/no-explicit-any */
import { constructMetadata } from "@/lib/metadata";
import HomeContent from "../_components/Dashboard/HomeContent";
import { Goal, UsefulLink } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/utils";
import DeniedAccess from "../_components/Global/DeniedAccess";

// Tipagem para os dados que a página e o componente cliente esperam
export interface HomeContentData {
  goals: Goal[];
  myPoints: number;
  numberOfTasks: number;
  usefulLinks: UsefulLink[];
  globalLinks: UsefulLink[]; // Links globais, se necessário
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
      return {
        goals: [],
        myPoints: 0,
        numberOfTasks: 0,
        usefulLinks: [],
        globalLinks: [],
      };
    }

    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };

    const [
      strategyResponse,
      myPointsResponse,
      numberOfTasksResponse,
      usefulLinksResponse,
      globalLinksResponse,
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
      fetch(`${baseUrl}/api/useful-links`, { cache: "no-store", headers }),
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
    const globalLinksData = globalLinksResponse.ok
      ? await globalLinksResponse.json()
      : { links: [] };

    return {
      goals: goals,
      myPoints: myPointsData.myPoints?.totalPoints ?? 0,
      numberOfTasks: numberOfTasksData.length || 0,
      usefulLinks: usefulLinksData.links || [],
      globalLinks: globalLinksData.links || [],
    };
  } catch (error) {
    console.error("Falha ao buscar dados do dashboard.", error);
    return {
      goals: [],
      myPoints: 0,
      numberOfTasks: 0,
      usefulLinks: [],
      globalLinks: [],
    };
  }
}

export default async function Home() {
  const initialData = await getPageData();
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({ pathname: "/", user: user! });
  if(!hasPermission) return <DeniedAccess />

  return (
    <div className="md:p-8 p-4 h-full">
      <HomeContent initialData={initialData} />
    </div>
  );
}
