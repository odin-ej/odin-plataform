import { EstrategyObjective, EstrategyPlan, Goal, Value } from "@prisma/client";
import { constructMetadata } from "@/lib/metadata";
import UpdateStrategyContent from "@/app/_components/Dashboard/atualizar-estrategia/UpdateStrategyContent";
import { cookies } from "next/headers";
import { getAuthenticatedUser } from "@/lib/server-utils";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { verifyAccess } from "@/lib/utils";

export const metadata = constructMetadata({ title: "Atualizar Estratégia" });

export const dynamic = "force-dynamic";

export type EstrategyObjectiveWithGoals = EstrategyObjective & {
  goals: Goal[];
};

export type fullStrategy = EstrategyPlan & {
  values: Value[];
  estrategyObjectives: EstrategyObjective[];
};

interface MetasPageProps {
  estrategyObjectives: EstrategyObjectiveWithGoals[] | null;
  fullStrategy: fullStrategy | null;
}

async function getPageData(): Promise<MetasPageProps> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const [estrategyObjectivesResponse, fullStrategyResponse] =
      await Promise.all([
        fetch(`${baseUrl}/api/house-goals`, {
          next: { revalidate: 45 },
          headers,
        }),
        fetch(`${baseUrl}/api/culture`, {
          next: { revalidate: 45 },
          headers,
        }),
      ]);

    const estrategyObjectives: EstrategyObjectiveWithGoals[] =
      await estrategyObjectivesResponse.json();
    const fullStrategyResult: fullStrategy = await fullStrategyResponse.json();
    const fullStrategy = Array.isArray(fullStrategyResult)
      ? fullStrategyResult[0]
      : null;

    return { estrategyObjectives, fullStrategy };
  } catch (error) {
    console.error("Falha ao buscar os dados da página.", error);
    return { estrategyObjectives: null, fullStrategy: null };
  }
}

const Page = async () => {
  const { estrategyObjectives, fullStrategy } = await getPageData();
      const user = await getAuthenticatedUser();
    const hasPermission = verifyAccess({ pathname: "/atualizar-estrategia", user: user! });
    if (!hasPermission) return <DeniedAccess />;
  return (
    <div className="p-4 sm:p-8">
      <UpdateStrategyContent
        estrategyObjectives={estrategyObjectives!}
        fullStrategy={fullStrategy!}
      />
    </div>
  );
};

export default Page;
