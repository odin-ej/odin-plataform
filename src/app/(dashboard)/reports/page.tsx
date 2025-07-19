import ReportsContent from "@/app/_components/Dashboard/ReportsContent";
import { constructMetadata } from "@/lib/metadata";
import { ExtendedReport } from "@/lib/schemas/reportSchema";
import { User, Role } from ".prisma/client";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Reports" });

interface ReportsPageData {
  myReports: ExtendedReport[];
  reportsForMe: ExtendedReport[];
  allUsers: User[];
  allRoles: Role[];
}

async function getPageData(): Promise<ReportsPageData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // Para manter sessão/autenticação
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const [reportsRes, usersRes, rolesRes] = await Promise.all([
      fetch(`${baseUrl}/api/reports`, {
        next: { revalidate: 45 },
        headers,
      }),
      fetch(`${baseUrl}/api/users`, {
        next: { revalidate: 45 },
        headers,
      }),
      fetch(`${baseUrl}/api/roles`, {
        next: { revalidate: 45 },
        headers,
      }),
    ]);

    if (!reportsRes.ok || !usersRes.ok || !rolesRes.ok) {
      console.error("Falha ao buscar dados:", {
        reports: reportsRes.status,
        users: usersRes.status,
        roles: rolesRes.status,
      });
      throw new Error("Falha ao buscar dados da página.");
    }

    const reportsData: {
      myReports: ExtendedReport[];
      reportsForMe: ExtendedReport[];
    } = await reportsRes.json();

    const usersJson = await usersRes.json();
    const users: User[] = usersJson.users;
    const roles: Role[] = await rolesRes.json();

    return {
      myReports: reportsData.myReports,
      reportsForMe: reportsData.reportsForMe,
      allUsers: users,
      allRoles: roles,
    };
  } catch (error) {
    console.error("Erro ao buscar dados da página de reports:", error);
    return {
      myReports: [],
      reportsForMe: [],
      allUsers: [],
      allRoles: [],
    };
  }
}

const Page = async () => {
  const { myReports, reportsForMe, allUsers, allRoles } = await getPageData();
  return (
    <div className="md:p-8 p-4 overflow-x-auto">
      <ReportsContent
        myReports={myReports}
        reportsForMe={reportsForMe}
        allUsers={allUsers}
        allRoles={allRoles}
      />
    </div>
  );
};

export default Page;
