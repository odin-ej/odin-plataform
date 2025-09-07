import OraculoContent from "@/app/_components/Dashboard/oraculo/OraculoContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";

export type FullOraculoFolder = Prisma.OraculoFolderGetPayload<{
  include: {
    parent: true;
    owner: {
      select: {
        name: true;
        imageUrl: true;
        id: true;
      };
    };
  };
}>;

export type FullOraculoFile = Prisma.OraculoFileGetPayload<{
  include: {
    owner: {
      select: {
        name: true;
        imageUrl: true;
        id: true;
      };
    };
    folder: true;
  };
}>;

export interface OraculoPageProps {
  folders: FullOraculoFolder[];
  files: FullOraculoFile[];
}

export const metadata = constructMetadata({
  title: "Oráculo",
});

async function getOraculoData(): Promise<OraculoPageProps> {
  try {
     const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const cookiesStore = await cookies();
      const headers = { Cookie: cookiesStore.toString() };
      const response = await fetch(`${baseUrl}/api/oraculo`, {
        cache: "no-store",
        headers,
      });

    if(!response.ok){
      throw new Error("Failed to fetch Oraculo data");
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching Oraculo data:", error);
    return { folders: [], files: [] };
  }
}

const Page = async () => {
  const initialData = await getOraculoData();

  const authUser = await getAuthenticatedUser();

  const hasPermission = verifyAccess({ pathname: "/oraculo", user: authUser! });
  if (!hasPermission) return <DeniedAccess />;

  return (
    <div className="sm:p-4 p-2">
      <OraculoContent initialData={initialData} />
    </div>
  );
};

export default Page;
