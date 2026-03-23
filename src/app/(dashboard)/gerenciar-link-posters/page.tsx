import LinkPostersPageContent from "@/app/_components/Dashboard/link-posters/LinkPostersPageContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { LinkPoster } from "@prisma/client";
import { cookies } from "next/headers";

export interface LinkPostersPageData {
  linkPosters: LinkPoster[] | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Link Posters" });

async function getPageData(): Promise<LinkPostersPageData> {
  try {
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };

    const response = await fetch(`${API_URL}/api/link-posters`, {
      headers,
    });
    const linksPostersData: LinkPoster[] = await response.json();
    if (linksPostersData) return { linkPosters: linksPostersData };

    return { linkPosters: [] };
  } catch (error) {
    console.error(error);
    return { linkPosters: null };
  }
}

const Page = async () => {
  const initialData = await getPageData();
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({
    pathname: "/gerenciar-link-posters",
    user: user!,
  });
  if (!hasPermission) return <DeniedAccess />;
  return (
    <div className="sm:p-8 p-4">
      <LinkPostersPageContent initialData={initialData} />
    </div>
  );
};

export default Page;
