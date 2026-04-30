/**
 * Pagina pessoal do Fecs Week Game (rota: /fecs-week-game/meus-pontos).
 *
 * Proposito:
 *   Wrapper temporario que reaproveita `MyPointsContent` para apresentar
 *   o historico pessoal e o fluxo de "Solicitar Pontos" sob o branding do
 *   evento Fecs Week Game.
 *
 * Fluxo coberto:
 *   1. Usuario submete uma solicitacao (POST /api/jr-points/solicitations).
 *   2. Aprovador (com cargo "Aprovador Fecs Week") aprova/rejeita em
 *      /fecs-week-game/gerenciar.
 *   3. Pontos aprovados aparecem aqui (em "Meus Pontos") e no ranking de
 *      /fecs-week-game.
 *
 * Backend nao muda: usa o mesmo endpoint `/api/my-points/[id]`.
 */

import { getAuthenticatedUser } from "@/lib/server-utils";
import { cookies } from "next/headers";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { verifyAccess } from "@/lib/utils";
import { constructMetadata } from "@/lib/metadata";
import MyPointsContent from "@/app/_components/Dashboard/jr-points/MyPointsContent";
import { MyPointsData } from "@/app/(dashboard)/meus-pontos/page";
import { PointsBrandingProvider } from "@/app/_components/Global/PointsBrandingProvider";
import { FECS_WEEK_BRANDING } from "@/lib/branding";

export const dynamic = "force-dynamic";
export const metadata = constructMetadata({ title: FECS_WEEK_BRANDING.pageTitleMyPoints });

/**
 * Busca os dados pessoais do usuario logado, reutilizando o endpoint
 * existente do JR Points.
 *
 * @param id  Identificador do usuario autenticado.
 * @returns   `MyPointsData` ja serializado pelo backend.
 */
async function getMyPoints({ id }: { id: string }): Promise<MyPointsData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const response = await fetch(`${baseUrl}/api/my-points/${id}`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Falha ao buscar os dados da página.`);
    }
    return response.json();
  } catch (error) {
    console.error("Erro em getMyPoints (Fecs Week Game):", error);
    return {
      myPoints: null,
      allTagTemplates: [],
      allUsers: [],
      mySemesterScores: [],
      enterpriseTags: [],
    };
  }
}

const Page = async () => {
  const authUser = await getAuthenticatedUser();
  if (!authUser?.id) {
    return <div className="p-8 text-white">Usuário não autenticado.</div>;
  }

  const hasPermission = verifyAccess({
    pathname: "/fecs-week-game/meus-pontos",
    user: authUser,
  });
  if (!hasPermission) return <DeniedAccess />;

  const initialData = await getMyPoints({ id: authUser.id });

  return (
    <PointsBrandingProvider value={FECS_WEEK_BRANDING}>
      <div className="p-4 sm:p-8">
        <MyPointsContent initialData={initialData} />
      </div>
    </PointsBrandingProvider>
  );
};

export default Page;
