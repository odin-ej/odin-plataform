import SalaEaufbaContent from "@/app/_components/Dashboard/SalasEaufbaContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { ReserveRequestToConections, User } from "@prisma/client";
import { cookies } from "next/headers";

export interface SalasEAUFBAPageProps {
  reserveRequestToConections: (ReserveRequestToConections & {
    applicant: User;
  })[];
}

export const metadata = constructMetadata({title: 'Salas EAUFBA'})

export const dynamic = 'force-dynamic'

async function getPageData(): Promise<SalasEAUFBAPageProps> {
  try {
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/reserve/salas-eaufba`, {
      cache: "no-store",
      headers,
    });
    if (!response.ok) throw new Error("Falha ao buscar os dados da página.");
    return {reserveRequestToConections: await response.json()};
  } catch (error) {
    console.error("Erro em getPageData:", error);
    return { reserveRequestToConections: [] };
  }
}

const Page = async () => {
  const user = await getAuthenticatedUser();

  const hasPermission = verifyAccess({
    pathname: "/salas-eaufba",
    user: user!,
  });
  if (!hasPermission) return <DeniedAccess />;

  const initialData = await getPageData();
  return (
    <div className="sm:p-8 p-4">
      <SalaEaufbaContent initialData={initialData} />
    </div>
  );
};

export default Page;
