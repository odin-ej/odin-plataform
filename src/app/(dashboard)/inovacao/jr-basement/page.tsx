import BasementContent from "@/app/_components/Dashboard/inovacao/JRBasement/BasementContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { getAllIdeas, getMyIdeas } from "@/lib/actions/basement";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "JR Basement",
};

const Page = async () => {
  const authUser = await getAuthenticatedUser();

  const hasAccess = verifyAccess({
    user: authUser!,
    pathname: "/inovacao",
  });

  if (!hasAccess) return <DeniedAccess />;

  const [allIdeas, myIdeas] = await Promise.all([getAllIdeas(), getMyIdeas()]);

  return <BasementContent initialAllIdeas={allIdeas} initialMyIdeas={myIdeas} />;
};

export default Page;
