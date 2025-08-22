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
  estrategyObjectives: EstrategyObjectiveWithGoals[];
  fullStrategy: fullStrategy | null;
}

async function getPageData(): Promise<MetasPageProps> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const response = await fetch(`${baseUrl}/api/update-strategy`, {
      next: { revalidate: 45 },
      headers,
    });
    if (!response.ok) {
      throw new Error("Falha ao buscar os dados da página.");
    }

    const data = await response.json();

    return {
      estrategyObjectives:
        data.estrategyObjectives as EstrategyObjectiveWithGoals[],
      fullStrategy: {
        values: data.values as Value[],
        estrategyObjectives: data.estrategyObjectives as EstrategyObjective[],
        id: data.id,
        propose: data.propose,
        mission: data.mission,
        vision: data.vision,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as fullStrategy,
    };
  } catch (error) {
    console.error("Falha ao buscar os dados da página.", error);
    return { estrategyObjectives: [], fullStrategy: null };
  }
}

const Page = async () => {
  const { estrategyObjectives, fullStrategy } = await getPageData();
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({
    pathname: "/atualizar-estrategia",
    user: user!,
  });
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
