import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/utils";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { TagWithAction } from "@/lib/schemas/pointsSchema";
import { EnterpriseSemesterScore, Prisma, Semester } from "@prisma/client";
import JrPointsContent, {
  RankingItem,
} from "@/app/_components/Dashboard/jr-points/JrPointsContent";

// Tipagem para os dados da página
export interface JrPointsPageData {
  myPoints: number;
  usersRanking: {
    id: string;
    name: string;
    imageUrl: string;
    totalPoints: number;
  }[];
  enterpriseTags: TagWithAction[];
  rankingIsHidden: boolean;
  enterprisePoints: number;
  usersTotalPoints?: number;
  enterpriseSemesterScores: EnterpriseSemesterScore[];
  allVersions: Prisma.JRPointsVersionGetPayload<{
    include: {
      _count: true;
      tagTemplates: {
        include: {
          actionType: true;
          jrPointsVersion: true;
        };
      };
    };
  }>[];
  allSemesters: Semester[];
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
    return {
      allVersions: [],
      allSemesters: [],
      enterpriseSemesterScores: [],
      myPoints: 0,
      usersRanking: [],
      rankingIsHidden: false,
      enterprisePoints: 0,
      enterpriseTags: [],
    };
  }
}

const Page = async () => {
  const [user, data] = await Promise.all([
    getAuthenticatedUser(),
    getPageData(),
  ]);
  if (!user) return <div>Não autenticado.</div>;
  const hasPermission = verifyAccess({ pathname: "/jr-points", user: user! });
  if (!hasPermission) return <DeniedAccess />;
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
    enterpriseTags: data.enterpriseTags,
    myPoints: myPoints,
    initialIsHidden: data.rankingIsHidden,
    enterpriseSemesterScores: data.enterpriseSemesterScores,
    allVersions: data.allVersions,
    allSemesters: data.allSemesters,
  };

  return (
    <div className="p-4 sm:p-8">
      <JrPointsContent initialData={initialData} />
    </div>
  );
};

export default Page;
