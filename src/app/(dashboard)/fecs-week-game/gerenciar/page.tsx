/**
 * Pagina administrativa do Fecs Week Game (rota: /fecs-week-game/gerenciar).
 *
 * Proposito:
 *   Wrapper temporario que reaproveita `EnterprisePageContent` para
 *   centralizar a gestao do evento (versoes, semestres, tags, solicitacoes)
 *   sob o branding do Fecs Week Game.
 *
 * Permissao:
 *   Acesso controlado pela policy `policy-fecs-week-approvers` (ver
 *   `prisma/seed-permissions.ts`). Em codigo, a rota e mapeada para
 *   `FECS_WEEK_APPROVERS` em `src/lib/permissions.ts`. Para que um usuario
 *   apareça aqui, ele precisa ter o cargo "Aprovador Fecs Week" criado e
 *   atribuido via `/gerenciar-cargos` e `/usuarios`.
 *
 * Backend nao muda: usa o mesmo endpoint `/api/jr-points/management`.
 */

import EnterprisePageContent from "@/app/_components/Dashboard/jr-points/EnterprisePageContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { cookies } from "next/headers";
import { JrEnterprisePointsPageData } from "@/app/(dashboard)/gerenciar-jr-points/page";
import { PointsBrandingProvider } from "@/app/_components/Global/PointsBrandingProvider";
import { FECS_WEEK_BRANDING } from "@/lib/branding";

export const metadata = constructMetadata({ title: FECS_WEEK_BRANDING.pageTitleManage });
export const dynamic = "force-dynamic";

/**
 * Busca os dados administrativos do JR Points (compartilhados com o
 * Fecs Week Game pelo backend).
 *
 * @returns `JrEnterprisePointsPageData` ja serializado pelo backend.
 */
async function getPageData(): Promise<JrEnterprisePointsPageData> {
  try {
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/jr-points/management`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) throw new Error("Falha ao buscar os dados da página.");
    return response.json();
  } catch (error) {
    console.error("Erro em getPageData (Fecs Week Game - gerenciar):", error);
    return {
      enterprisePoints: null,
      enterpriseTags: [],
      usersRanking: [],
      allUsers: [],
      allTagTemplates: [],
      allActionTypes: [],
      allVersions: [],
      usersSemesterScore: [],
      solicitations: [],
      jrPointsReports: [],
      allSemesters: [],
      enterpriseSemesterScores: [],
    };
  }
}

const Page = async () => {
  const initialData = await getPageData();
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({
    pathname: "/fecs-week-game/gerenciar",
    user: user!,
  });
  if (!hasPermission) return <DeniedAccess />;
  return (
    <PointsBrandingProvider value={FECS_WEEK_BRANDING}>
      <div className="md:p-8 p-4">
        <EnterprisePageContent initialData={initialData} />
      </div>
    </PointsBrandingProvider>
  );
};

export default Page;
