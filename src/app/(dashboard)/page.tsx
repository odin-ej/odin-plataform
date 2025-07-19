import { constructMetadata } from "@/lib/metadata";
import HomeContent from "../_components/Dashboard/HomeContent";

import { EstrategyObjective, Goal, UsefulLink } from ".prisma/client";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";

// Definição clara do tipo de dados esperado pela página
interface EstrategyObjectiveWithGoals extends EstrategyObjective {
  goals: Goal[];
}

// CORREÇÃO: A interface agora reflete a nova estrutura de dados com um array plano de 'goals'
interface HomeContentData {
  goals: Goal[] | null;
  myPoints: number;
  numberOfTasks: number;
  usefulLinks: UsefulLink[] | [];
}

export const metadata = constructMetadata({
  title: "Bem-vindo(a) ao Dashboard",
});

export const dynamic = "force-dynamic";

/**
 * Busca todos os dados necessários para a página do dashboard.
 * Esta função é mais resiliente, tratando falhas de API individualmente.
 */
async function getPageData(): Promise<HomeContentData> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const authUser = await getAuthenticatedUser();
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    if (authUser!.isExMember)
      return { goals: null, myPoints: 0, numberOfTasks: 0, usefulLinks: [] };
    const [
      strategyResponse,
      myPointsResponse,
      numberOfTasksResponse,
      usefulLinksResponse,
    ] = await Promise.all([
      fetch(`${baseUrl}/api/house-goals`, {
        next: { revalidate: 45 },
        headers,
      }),
      fetch(`${baseUrl}/api/my-points/${authUser!.id}`, {
        next: { revalidate: 45 },
        headers,
      }),
      fetch(`${baseUrl}/api/my-tasks`, {
        next: { revalidate: 45 },
        headers,
      }),
      fetch(`${baseUrl}/api/users/${authUser!.id}/useful-links`, {
        next: { revalidate: 45 },
        headers,
      }),
    ]);

    // Processa a resposta da estratégia
    const estrategy = strategyResponse.ok
      ? ((await strategyResponse.json()) as EstrategyObjectiveWithGoals[])
      : null;

    // CORREÇÃO: Extrai e achata todos os 'goals' de todos os objetivos em um único array
    const allGoals = estrategy
      ? estrategy.flatMap((objective) => objective.goals)
      : null;

    const myPointsData = myPointsResponse.ok
      ? await myPointsResponse.json()
      : { totalPoints: 0 };

    const numberOfTasksData = numberOfTasksResponse.ok
      ? await numberOfTasksResponse.json()
      : [];

    const usefulLinksData = usefulLinksResponse.ok
      ? await usefulLinksResponse.json()
      : [];

    if (!strategyResponse.ok) {
      console.error("Falha ao buscar os objetivos estratégicos.");
    }

    return {
      goals: allGoals,
      myPoints: myPointsData.myPoints
        ? myPointsData.myPoints.totalPoints ?? 0
        : 0,
      numberOfTasks: numberOfTasksData.length || 0,
      usefulLinks: usefulLinksData.links,
    };
  } catch (error) {
    console.error(
      "Falha crítica ao buscar os dados da página do dashboard.",
      error
    );
    // CORREÇÃO: Retorna um estado seguro com 'goals' como nulo
    return { goals: null, myPoints: 0, numberOfTasks: 0, usefulLinks: [] };
  }
}

export default async function Home() {
  // CORREÇÃO: Destrutura 'goals' em vez de 'estrategy'
  const { goals, myPoints, numberOfTasks, usefulLinks } = await getPageData();

  // Garante que o componente HomeContent receba os dados corretos, mesmo que a API falhe.
  return (
    <div className="md:p-8 p-4 h-full">
      <HomeContent
        goals={goals || []}
        myPoints={myPoints}
        numberOfTasks={numberOfTasks}
        usefulLinks={usefulLinks}
      />
    </div>
  );
}
