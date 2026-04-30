/**
 * Pagina geral do Fecs Week Game (rota: /fecs-week-game).
 *
 * Proposito:
 *   Wrapper temporario que reaproveita o componente `JrPointsContent` (e
 *   toda a infraestrutura de APIs/modelos do JR Points) sob o branding do
 *   evento Fecs Week Game.
 *
 * Como funciona:
 *   - Reutiliza `getPageData` chamando o mesmo endpoint do JR Points
 *     (`/api/jr-points`). Backend nao muda; o isolamento de dados acontece
 *     atraves da `JRPointsVersion` ativa (criar uma versao "Fecs Week Game"
 *     antes de usar).
 *   - Verifica acesso pela rota `/fecs-week-game` (permissoes em
 *     `src/lib/permissions.ts`).
 *   - Envelopa o conteudo em `<PointsBrandingProvider value={FECS_WEEK_BRANDING}>`
 *     para aplicar os textos/paths do evento.
 *
 * Reverter:
 *   Bastam ocultar a rota da sidebar via `FECS_WEEK_ACTIVE = false`
 *   (em `src/lib/branding.ts`).
 */

import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";
import { canAccessRoute } from "@/lib/actions/server-helpers";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import JrPointsContent, {
  RankingItem,
} from "@/app/_components/Dashboard/jr-points/JrPointsContent";
import { JrPointsPageData } from "@/app/(dashboard)/jr-points/page";
import { PointsBrandingProvider } from "@/app/_components/Global/PointsBrandingProvider";
import { FECS_WEEK_BRANDING } from "@/lib/branding";

export const dynamic = "force-dynamic";
export const metadata = constructMetadata({ title: FECS_WEEK_BRANDING.pageTitleHome });

/**
 * Busca os dados iniciais da pagina geral, reutilizando o endpoint
 * existente do JR Points.
 *
 * @returns `JrPointsPageData` ja serializado pelo backend.
 */
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
    console.error("Erro em getPageData (Fecs Week Game):", error);
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
  // Usa o sistema dinamico de permissoes (RoutePermission do banco) para que
  // mudancas em /gerenciar-permissoes refletem sem redeploy.
  const hasPermission = await canAccessRoute(user, "/fecs-week-game");
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
    <PointsBrandingProvider value={FECS_WEEK_BRANDING}>
      <div className="p-4 sm:p-8">
        <JrPointsContent initialData={initialData} />
      </div>
    </PointsBrandingProvider>
  );
};

export default Page;
