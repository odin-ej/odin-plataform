
import { getAuthenticatedUser } from "@/lib/server-utils";
import {  User, UserPoints, UserSemesterScore } from "@prisma/client";
import { TagWithAction, TagTemplateWithAction, } from "@/lib/schemas/pointsSchema";
import { cookies } from "next/headers";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { verifyAccess } from "@/lib/utils";
import { constructMetadata } from "@/lib/metadata";
import MyPointsContent from "@/app/_components/Dashboard/jr-points/MyPointsContent";


export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Meus Pontos" });

// Tipagem completa para todos os dados que a página precisa
export interface MyPointsData {
  myPoints: (UserPoints & { tags: TagWithAction[] }) | null;
  allTagTemplates: TagTemplateWithAction[];
  allUsers: Pick<User, 'id' | 'name'>[];
  mySemesterScores: UserSemesterScore[];
  enterpriseTags: TagWithAction[]
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
    return response.json();
  } catch (error) {
    console.error("Erro em MyPoints:", error);
    // Retorna um objeto completo com valores padrão em caso de erro
    return { 
        myPoints: null,
        allTagTemplates: [],
        allUsers: [],
        mySemesterScores: [],
        enterpriseTags: []
    };
  }
}

const Page = async () => {
  const authUser = await getAuthenticatedUser();
  if (!authUser?.id) {
    return <div className="p-8 text-white">Usuário não autenticado.</div>;
  }

  const hasPermission = verifyAccess({ pathname: "/meus-pontos", user: authUser });
  if (!hasPermission) return <DeniedAccess />;
  
  // A função getMyPoints agora retorna o objeto completo
  const initialData = await getMyPoints({ id: authUser.id });

  return (
    <div className="p-4 sm:p-8">
      <MyPointsContent initialData={initialData} />
    </div>
  );
};

export default Page;
