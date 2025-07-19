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

interface JrEnterprisePointsPageData {
  enterprisePoints: number;
  enterpriseTags: TagWithAction[];
  usersRanking: UserRankingInfo[];
  allUsers: (User & { imageUrl: string | null })[];
  allTags: TagWithAction[];
  allActionTypes: ActionTypeWithCount[];
}

async function getPageData(): Promise<JrEnterprisePointsPageData> {
  try {
    // Em produção, use uma variável de ambiente para o URL base da sua aplicação.
    const cookiesStore = await cookies();
            const headers = { Cookie: cookiesStore.toString() };
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // Faz uma única chamada à sua API agregadora.
    const response = await fetch(`${baseUrl}/api/jr-points`, {
      next: { revalidate: 45 },
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Falha ao buscar os dados da página. Status: ${response.status}`
      );
    }

    return response.json();
  } catch (error) {
    console.error("Erro em getPageData:", error);
    // Retorna dados vazios em caso de erro para não quebrar a página.
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
  const data = await getPageData();

  return (
    <div className="md:p-8 p-4">
      <EnterprisePageContent
        enterprisePoints={data.enterprisePoints}
        enterpriseTags={data.enterpriseTags}
        usersRanking={data.usersRanking}
        allUsers={data.allUsers}
        allTags={data.allTags}
        allActionTypes={data.allActionTypes}
      />
    </div>
  );
};

export default Page;
