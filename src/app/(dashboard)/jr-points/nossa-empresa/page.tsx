import EnterprisePageContent from "@/app/_components/Dashboard/EnterprisePageContent";
import { constructMetadata } from "@/lib/metadata";
import {
  ActionTypeWithCount,
  TagWithAction,
  UserRankingInfo,
} from "@/lib/schemas/pointsSchema";
import { User } from ".prisma/client";
import { cookies } from "next/headers";

export const metadata = constructMetadata({ title: "Empresa - JR Points" });
export const dynamic = "force-dynamic";

// Mantemos a interface para clareza
export interface JrEnterprisePointsPageData {
  enterprisePoints: number;
  enterpriseTags: TagWithAction[];
  usersRanking: UserRankingInfo[];
  allUsers: (User & { imageUrl: string | null })[];
  allTags: TagWithAction[];
  allActionTypes: ActionTypeWithCount[];
}

async function getPageData(): Promise<JrEnterprisePointsPageData> {
  try {
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/jr-points`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) throw new Error("Falha ao buscar os dados da página.");
    return response.json();
  } catch (error) {
    console.error("Erro em getPageData:", error);
    return {
      enterprisePoints: 0,
      enterpriseTags: [],
      usersRanking: [],
      allUsers: [],
      allTags: [],
      allActionTypes: [],
    };
  }
}

const Page = async () => {
  const initialData = await getPageData();

  return (
    <div className="md:p-8 p-4">
      <EnterprisePageContent initialData={initialData} />
    </div>
  );
};

export default Page;
