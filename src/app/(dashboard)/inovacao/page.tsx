import { FullInovationInitiative } from "@/app/_components/Dashboard/inovacao/InovationCard";
import InovacaoHub from "@/app/_components/Dashboard/inovacao/InovacaoHub";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { getAllInovationInitiatives } from "@/lib/actions/inovation";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Espaço de Inovação",
};

const Page = async () => {
  const initiatives: FullInovationInitiative[] = await getAllInovationInitiatives();

  const authUser = await getAuthenticatedUser();

  const hasAccess = verifyAccess({
    user: authUser!,
    pathname: "/inovacao",
  });

  if (!hasAccess) return <DeniedAccess />;

  return <InovacaoHub initiatives={initiatives} />;
};

export default Page;
