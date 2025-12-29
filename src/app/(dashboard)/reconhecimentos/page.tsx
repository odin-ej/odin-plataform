import RecognitionsContent from "@/app/_components/Dashboard/reconhecimentos/RecognitionsContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Reconhecimentos" });

const Page = async () => {

   const initialData = []

  const authUser = await getAuthenticatedUser();

  const hasAccess = verifyAccess({
    user: authUser!,
    pathname: "/reconhecimentos",
  });

  if (!hasAccess) return <DeniedAccess />;
  return <>
  <RecognitionsContent initialData={initialData} /></>;
};

export default Page;
