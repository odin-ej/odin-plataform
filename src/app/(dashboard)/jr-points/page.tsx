import { constructMetadata } from "@/lib/metadata";
import JrPointsContent, {
  RankingItem,
} from "@/app/_components/Dashboard/JrPointsContent";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";

// Interface que define a estrutura de dados esperada da nossa API
interface JrPointsPageData {
  usersRanking: {
    id: string;
    name: string;
    imageUrl: string;
    totalPoints: number;
  }[];
  rankingIsHidden: boolean;
  enterprisePoints: number; // Adicionado para os pontos da empresa
}

export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Geral - JR Points" });

async function getPageData(): Promise<JrPointsPageData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    // A chamada à API agora busca todos os dados de uma só vez
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
    // Retorna um estado seguro e completo em caso de erro
    return {
      usersRanking: [],
      rankingIsHidden: false,
      enterprisePoints: 0,
    };
  }
}

const Page = async () => {
  // Busca todos os dados necessários com uma única chamada
  const [user, data] = await Promise.all([
    getAuthenticatedUser(),
    getPageData(),
  ]);

  // Encontra os pontos do usuário atual na lista do ranking, de forma eficiente
  const myPoints =
    data.usersRanking.find((u) => u.id === user?.id)?.totalPoints || 0;

  // Pega apenas os 10 primeiros do ranking para exibir na tabela
  const rankingData: RankingItem[] = data.usersRanking
    .slice(0, 10)
    .map((user, index) => ({
      id: user.id,
      ranking: index + 1,
      name: user.name,
      points: user.totalPoints,
      imageUrl: user.imageUrl,
    }));

  return (
    <div className="p-4 sm:p-8">
      <JrPointsContent
        enterprisePoints={data.enterprisePoints} // Passa os pontos da empresa
        rankingData={rankingData}
        myPoints={myPoints}
        initialIsHidden={data.rankingIsHidden}
      />
    </div>
  );
};

export default Page;
