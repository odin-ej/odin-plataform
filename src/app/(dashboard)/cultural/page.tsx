/* eslint-disable @typescript-eslint/no-unused-vars */
import CulturalContent from "@/app/_components/Dashboard/cultural/CulturalContent";
import { constructMetadata } from "@/lib/metadata";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import { fullStrategy } from "../atualizar-estrategia/page";
import { cookies } from "next/headers";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { InterestCategory, ProfessionalInterest, Role, Semester } from "@prisma/client";

export const metadata = constructMetadata({ title: "Área Cultural" });

export const dynamic = "force-dynamic";

export interface MondayStats {
  totalProjects: number;
  details: { accountName: string; projectCount: number }[];
}

export interface CulturePageProps {
  estrategy: fullStrategy | null;
  allUsers: MemberWithFullRoles[] | null;
  mondayStats: {
    totalProjects: number;
    details: { accountName: string; projectCount: number }[];
  } | null;
  roles: Role[];
  interestCategories: InterestCategory[];
  professionalInterests: ProfessionalInterest[];
  semesters: Semester[]
}

async function getPageData(): Promise<CulturePageProps> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const [cultureResponse, mondayResponse] =
      await Promise.all([
        fetch(`${baseUrl}/api/culture`, {
          next: { revalidate: 45 },
          headers,
        }),
        fetch(`${baseUrl}/api/monday-stats`, {
          next: { revalidate: 45 },
          headers,
        }),
      ]);

    if (!cultureResponse.ok) {
      const errorText = await cultureResponse.text(); // Lê a resposta como texto para debug
      console.error(
        "Erro na resposta da API de plano estratégico:",
        cultureResponse.status,
        errorText
      );
      throw new Error(
        `Falha ao carregar plano estratégico: ${cultureResponse.statusText}`
      );
    }

    if (!mondayResponse.ok) {
      const errorText = await mondayResponse.text();
      console.error(
        "Erro na resposta da API de estatísticas do Monday:",
        mondayResponse.status,
        errorText
      );
      throw new Error(
        `Falha ao carregar estatísticas do Monday: ${mondayResponse.statusText}`
      );
    }

    const cultureJson = await cultureResponse.json()
    const mondayJson = await mondayResponse.json();
    const data = {
      estrategy: cultureJson.estrategyRes[0],
      allUsers: cultureJson.usersRes,
      roles:  cultureJson.rolesRes,
      mondayStats: mondayJson,
      interestCategories: cultureJson.categoriesInterestRes,
      professionalInterests: cultureJson.interestRes,
      semesters: cultureJson.semestersRes
    };
    return data;
  } catch (error) {
    return { estrategy: null, allUsers: null, mondayStats: null, roles: [], professionalInterests: [], interestCategories: [], semesters: [] };
  }
}

const Page = async () => {
  const { allUsers, estrategy, mondayStats, roles, interestCategories, professionalInterests, semesters } = await getPageData();
  if (!allUsers || !estrategy || !mondayStats) return null;
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({ pathname: "/cultural", user: user! });
  if (!hasPermission) return <DeniedAccess />;
  const initialData = { estrategy, allUsers, mondayStats, roles, interestCategories, professionalInterests, semesters };
  return (
    <div className="p-4 sm:p-8">
      <CulturalContent initialData={initialData} />
    </div>
  );
};

export default Page;
