import { DARKBLUE } from "@/lib/colors";
import RegisterArea from "./_components/RegisterArea";
import { Role } from ".prisma/client";
import { cookies } from "next/headers";

interface RegisterPageProps {
  roles: Role[];
}

export const dynamic = "force-dynamic";

async function getRolesData(): Promise<RegisterPageProps> {
  try {
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/roles`, {
      next: { revalidate: 45 },
      headers,
    });
    if (!response.ok) {
      throw new Error("Falha ao buscar os cargos no servidor.");
    }

    const rolesJson = await response.json();
    return { roles: rolesJson };
  } catch (error) {
    console.error("Erro em getPageData:", error);
    return { roles: [] };
  }
}

const Page = async () => {
  const { roles } = await getRolesData();
  return (
    <div
      style={{ backgroundColor: DARKBLUE }}
      className="flex flex-col min-h-screen"
    >
      {/* Conteúdo centralizado */}
      <div className="min-h-[calc(100vh-84px)] flex flex-1 flex-col justify-center items-center px-6 ">
        <h1 className="text-2xl mt-8 lg:text-3xl text-center font-semibold italic text-[#f5b719]">
          Cadastre-se na{" "}
          <span className="text-white text-3xl lg:text-4xl">Casinha</span> dos{" "}
          <span className="text-white text-3xl lg:text-4xl">Sonhos</span>
        </h1>

        <div className="my-8">
          <RegisterArea roles={roles} />
        </div>
      </div>
    </div>
  );
};

export default Page;
