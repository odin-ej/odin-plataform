import MyPointsContent from "@/app/_components/Dashboard/MyPointsContent";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { UserPoints } from "@prisma/client";
import { TagWithAction } from "@/lib/schemas/pointsSchema";
import { cookies } from "next/headers";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { verifyAccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Tipagem para os dados da página
export interface MyPointsData {
  myPoints: (UserPoints & { tags: TagWithAction[] }) | null;
}

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
    const myPointsJson = await response.json();
    return { myPoints: myPointsJson.myPoints };
  } catch (error) {
    console.error("Erro em MyPoints:", error);
    return { myPoints: null };
  }
}

const Page = async () => {
  const authUser = await getAuthenticatedUser();
  // Se não houver usuário autenticado, não podemos buscar os pontos
  if (!authUser?.id) {
    // Você pode redirecionar ou mostrar uma mensagem de erro aqui
    return <div className="p-8 text-white">Usuário não autenticado.</div>;
  }
  const hasPermission = verifyAccess({ pathname: "/meus-pontos", user: authUser });
  if (!hasPermission) return <DeniedAccess />;
  const initialData = await getMyPoints({ id: authUser.id });

  return (
    <div className="p-4 sm:p-8">
      {/* Passamos os dados dentro de um objeto 'initialData' */}
      <MyPointsContent initialData={initialData} />
    </div>
  );
};

export default Page;
