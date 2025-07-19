import MetasContent from "@/app/_components/Dashboard/MetasContent";
import { EstrategyObjective, Goal } from ".prisma/client";
import { constructMetadata } from "@/lib/metadata";
import { cookies } from "next/headers";

export const metadata = constructMetadata({ title: "Metas da Casinha" });

export const dynamic = "force-dynamic";

type EstrategyObjectiveWithGoals = EstrategyObjective & {
  goals: Goal[];
};

interface MetasPageProps {
  estrategyObjectives: EstrategyObjectiveWithGoals[] | null;
}

async function getPageData(): Promise<MetasPageProps> {
  try {
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/house-goals`, {
      next: { revalidate: 45 },
      headers,
    });

    const estrategyObjectives: EstrategyObjectiveWithGoals[] =
      await response.json();

    return { estrategyObjectives };
  } catch (error) {
    console.error("Falha ao buscar os dados da página.", error);
    return { estrategyObjectives: null };
  }
}

const Page = async () => {
  const { estrategyObjectives } = await getPageData();

  return (
    <div className="p-4 sm:p-8">
      <MetasContent estrategyObjectives={estrategyObjectives!} />
    </div>
  );
};

export default Page;
