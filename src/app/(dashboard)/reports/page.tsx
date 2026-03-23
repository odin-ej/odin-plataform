import ReportsContent from "@/app/_components/Dashboard/reports/ReportsContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { ExtendedReport } from "@/lib/schemas/reportSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { User, Role } from "@prisma/client";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const metadata = constructMetadata({ title: "Reports" });

// Define the shape of our page data
export interface ReportsPageData {
  myReports: ExtendedReport[];
  reportsForMe: ExtendedReport[];
  allUsers: User[];
  allRoles: Role[];
}

async function getPageData(): Promise<ReportsPageData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };

    const [reportsRes, usersRes, rolesRes] = await Promise.all([
      fetch(`${baseUrl}/api/reports`, { cache: "no-store", headers }),
      fetch(`${baseUrl}/api/users`, { cache: "no-store", headers }),
      fetch(`${baseUrl}/api/roles`, { cache: "no-store", headers }),
    ]);

    if (!reportsRes.ok || !usersRes.ok || !rolesRes.ok) {
      throw new Error("Falha ao buscar dados da página.");
    }

    const reportsData = await reportsRes.json();
    const usersJson = await usersRes.json();
    const roles = await rolesRes.json();

    return {
      myReports: reportsData.myReports,
      reportsForMe: reportsData.reportsForMe,
      allUsers: usersJson.users,
      allRoles: roles,
    };
  } catch (error) {
    console.error("Erro ao buscar dados da página de reports:", error);
    return { myReports: [], reportsForMe: [], allUsers: [], allRoles: [] };
  }
}

const Page = async () => {
  const initialData = await getPageData();
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({ pathname: "/reports", user: user! });
  if (!hasPermission) return <DeniedAccess />;
  return (
    <div className="md:p-8 p-4 overflow-x-auto">
      {/* Pass the data as a single initialData object */}
      <ReportsContent initialData={initialData} />
    </div>
  );
};

export default Page;
