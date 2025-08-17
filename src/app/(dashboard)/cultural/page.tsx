/* eslint-disable @typescript-eslint/no-unused-vars */
import CulturalContent from "@/app/_components/Dashboard/cultural/CulturalContent";
import { constructMetadata } from "@/lib/metadata";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import { fullStrategy } from "../atualizar-estrategia/page";
import { cookies } from "next/headers";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { Role } from "@prisma/client";

export const metadata = constructMetadata({ title: "Área Cultural" });

export const dynamic = "force-dynamic";

interface CulturePageProps {
  estrategy: fullStrategy | null;
  allUsers: MemberWithFullRoles[] | null;
  mondayStats: {
    totalProjects: number;
    details: { accountName: string; projectCount: number }[];
  } | null;
  roles: Role[]
}

async function getPageData(): Promise<CulturePageProps> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const [estrategyPlanResponse, allUsersResponse, mondayResponse, rolesResponse] =
      await Promise.all([
        fetch(`${baseUrl}/api/culture`, {
          next: { revalidate: 45 },
          headers,
        }),
        fetch(`${baseUrl}/api/users`, {
          next: { revalidate: 45 },
          headers,
        }),
        fetch(`${baseUrl}/api/monday-stats`, {
          next: { revalidate: 45 },
          headers,
        }),
        fetch(`${baseUrl}/api/roles`, {
          next: {revalidate:45},
          headers
        })
      ]);

    if (!estrategyPlanResponse.ok) {
      const errorText = await estrategyPlanResponse.text(); // Lê a resposta como texto para debug
      console.error(
        "Erro na resposta da API de plano estratégico:",
        estrategyPlanResponse.status,
        errorText
      );
      throw new Error(
        `Falha ao carregar plano estratégico: ${estrategyPlanResponse.statusText}`
      );
    }

    // Verifique se a resposta da API de usuários foi bem-sucedida
    if (!allUsersResponse.ok) {
      const errorText = await allUsersResponse.text();
      console.error(
        "Erro na resposta da API de usuários:",
        allUsersResponse.status,
        errorText
      );
      throw new Error(
        `Falha ao carregar usuários: ${allUsersResponse.statusText}`
      );
    }

    // Verifique se a resposta da API de estatísticas do Monday foi bem-sucedida
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


    if(!rolesResponse.ok) {
      const errorText = await rolesResponse.text()
      console.error(
        "Erro na resposta da API de estatísticas do Monday:",
        rolesResponse.status,
        errorText
      );
      throw new Error(
        `Falha ao carregar os cargos: ${rolesResponse.statusText}`
      );
    }

    const estrategyPlanResult: fullStrategy =
      await estrategyPlanResponse.json();
    const estrategyPlan = Array.isArray(estrategyPlanResult)
      ? estrategyPlanResult[0]
      : null;
    const allUsersJson = await allUsersResponse.json();
    const allUsers: MemberWithFullRoles[] = allUsersJson.users;
    const mondayJson = await mondayResponse.json();
    const rolesJson = await rolesResponse.json()
    const data = {
      estrategy: estrategyPlan,
      allUsers,
      mondayStats: mondayJson,
      roles:  rolesJson,
    };
    return data;
  } catch (error) {
    return { estrategy: null, allUsers: null, mondayStats: null, roles: [] };
  }
}

const Page = async () => {
  const { allUsers, estrategy, mondayStats, roles } = await getPageData();
  if (!allUsers || !estrategy || !mondayStats) return null;
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({ pathname: "/cultural", user: user! });
  if (!hasPermission) return <DeniedAccess />;
  const initialData = { estrategy, allUsers, mondayStats, roles };
  return (
    <div className="p-4 sm:p-8">
      <CulturalContent initialData={initialData} />
    </div>
  );
};

export default Page;
