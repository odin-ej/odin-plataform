import { FullInovationInitiative } from "@/app/_components/Dashboard/inovacao/InovationCard";
import InovationContent from "@/app/_components/Dashboard/inovacao/InovationContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { getAllInovationInitiatives } from "@/lib/actions/inovation";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inovação",
};

const Page = async () => {

  const initialData: FullInovationInitiative[] = await getAllInovationInitiatives();

  const authUser = await getAuthenticatedUser();

  const hasAccess = verifyAccess({
    user: authUser!,
    pathname: "/inovacao",
  })

  if (!hasAccess) return <DeniedAccess />

  return (
    <>
      <InovationContent initialData={initialData} />
    </>
  );
};

export default Page;
