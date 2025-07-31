import KnowledgeContent from "@/app/_components/Dashboard/KnowledgeContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";

export const metadata = constructMetadata({ title: "Conhecimento IA" });

const Page = async () => {
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({ pathname: "/conhecimento-ia", user: user! });
  if (!hasPermission) return <DeniedAccess />;
  return <KnowledgeContent />;
};

export default Page;
