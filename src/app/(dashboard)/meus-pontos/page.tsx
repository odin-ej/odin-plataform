import MyPointsContent from "@/app/_components/Dashboard/MyPointsContent";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { UserPoints } from ".prisma/client";

import { TagWithAction } from "@/lib/schemas/pointsSchema";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getMyPoints({
  id,
}: {
  id: string;
}): Promise<{ myPoints: (UserPoints & { tags: TagWithAction[] }) | null }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    // Captura os cookies para manter autenticação

    const response = await fetch(`${baseUrl}/api/my-points/${id}`, {
      next: { revalidate: 45 },
      headers
    });

    if (!response.ok) {
      throw new Error(
        `Falha ao buscar os dados da página. Status: ${response.status}`
      );
    }
    const myPointsJson = await response.json();
    const myPoints: UserPoints & { tags: TagWithAction[] } =
      myPointsJson.myPoints;
    return { myPoints };
  } catch (error) {
    console.error("Erro em MyPoints:", error);
    return { myPoints: null };
  }
}

const Page = async () => {
  const authUser = await getAuthenticatedUser();
  const { myPoints } = await getMyPoints({ id: authUser!.id || "" });
  return (
    <div className="p-4 sm:p-8">
      <MyPointsContent myPoints={myPoints!} />
    </div>
  );
};

export default Page;
