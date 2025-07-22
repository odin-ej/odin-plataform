import MetasContent from "@/app/_components/Dashboard/MetasContent";
import { EstrategyObjective, Goal } from ".prisma/client";
import { constructMetadata } from "@/lib/metadata";
import { cookies } from "next/headers";

export const metadata = constructMetadata({ title: "Metas da Casinha" });
export const dynamic = "force-dynamic";

export type EstrategyObjectiveWithGoals = EstrategyObjective & {
  goals: Goal[];
};

export interface MetasPageProps {
  estrategyObjectives: EstrategyObjectiveWithGoals[];
}

async function getPageData(): Promise<MetasPageProps> {
  try {
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/house-goals`, {
      cache: "no-store", // Usamos no-store para garantir dados frescos no servidor
      headers,
    });

    if (!response.ok) {
      throw new Error("Falha ao buscar os dados da página.");
    }

    const estrategyObjectives: EstrategyObjectiveWithGoals[] =
      await response.json();
    return { estrategyObjectives };
  } catch (error) {
    console.error("Falha ao buscar os dados da página.", error);
    return { estrategyObjectives: [] }; // Retorna array vazio em caso de erro
  }
}

const Page = async () => {
  const initialData = await getPageData();

  return (
    <div className="p-4 sm:p-8">
      {/* Passamos os dados dentro de um objeto 'initialData' */}
      <MetasContent initialData={initialData} />
    </div>
  );
};

export default Page;
