import { constructMetadata } from "@/lib/metadata";
import JrPointsContent, {
  RankingItem,
} from "@/app/_components/Dashboard/JrPointsContent";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";

// Tipagem para os dados da página
export interface JrPointsPageData {
  usersRanking: {
    id: string;
    name: string;
    imageUrl: string;
    totalPoints: number;
  }[];
  rankingIsHidden: boolean;
  enterprisePoints: number;
}

export const dynamic = "force-dynamic";
export const metadata = constructMetadata({ title: "Geral - JR Points" });

async function getPageData(): Promise<JrPointsPageData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const response = await fetch(`${baseUrl}/api/jr-points`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) throw new Error("Falha ao buscar dados da página.");
    return response.json();
  } catch (error) {
    console.error("Erro em getPageData:", error);
    return { usersRanking: [], rankingIsHidden: false, enterprisePoints: 0 };
  }
}

const Page = async () => {
  const [user, data] = await Promise.all([
    getAuthenticatedUser(),
    getPageData(),
  ]);
  if (!user) return <div>Não autenticado.</div>;

  const myPoints =
    data.usersRanking.find((u) => u.id === user.id)?.totalPoints || 0;
  const rankingData: RankingItem[] = data.usersRanking
    .slice(0, 10)
    .map((u, index) => ({
      id: u.id,
      ranking: index + 1,
      name: u.name,
      points: u.totalPoints,
      imageUrl: u.imageUrl,
    }));

  // Monta o objeto de dados iniciais
  const initialData = {
    enterprisePoints: data.enterprisePoints,
    rankingData: rankingData,
    myPoints: myPoints,
    initialIsHidden: data.rankingIsHidden,
  };

  return (
    <div className="p-4 sm:p-8">
      <JrPointsContent initialData={initialData} />
    </div>
  );
};

export default Page;
