import EnterprisePageContent from "@/app/_components/Dashboard/jr-points/EnterprisePageContent";
import { FullJRPointsReport, FullJRPointsSolicitation } from "@/app/_components/Dashboard/jr-points/SolicitationsBoard";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import {
  ActionTypeWithCount,
  TagWithAction,
  UserRankingInfo,
  TagTemplateWithAction
} from "@/lib/schemas/pointsSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import {  EnterpriseSemesterScore, JRPointsVersion, Prisma, Semester, User, } from "@prisma/client";
import { cookies } from "next/headers";

export const metadata = constructMetadata({ title: "Gerenciar JR Points" });
export const dynamic = "force-dynamic";

// Mantemos a interface para clareza
export interface JrEnterprisePointsPageData {
  enterprisePoints: Prisma.EnterprisePointsGetPayload<{ include: { tags: true } }> | null;
  enterpriseTags: TagWithAction[];
  usersRanking: UserRankingInfo[];
  allUsers: (User & { imageUrl: string | null })[];
  allTagTemplates: TagTemplateWithAction[];
  allActionTypes: ActionTypeWithCount[];
  allVersions: JRPointsVersion[];
  usersSemesterScore: Prisma.UserSemesterScoreGetPayload<{
    include: { tags: { include: { assigner: true, actionType: true  }}; user: true };
  }>[];
  solicitations: FullJRPointsSolicitation[],
  jrPointsReports: FullJRPointsReport[];
  allSemesters: Semester[];
  enterpriseSemesterScores: EnterpriseSemesterScore[]
}

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
    console.error("Erro em getPageData:", error);
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
      enterpriseSemesterScores: []
    };
  }
}

const Page = async () => {
  const initialData = await getPageData();
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({ pathname: "/gerenciar-jr-points", user: user! });
  if(!hasPermission) return <DeniedAccess />
  return (
    <div className="md:p-8 p-4">
      <EnterprisePageContent initialData={initialData} />
    </div>
  );
};

export default Page;
