import GerenciarTraineesContent from "@/app/_components/Dashboard/gerenciar-trainees/GerenciarTraineesContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { getTrainees, getTraineeOverview } from "@/lib/actions/trainee";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Gerenciar Trainees" });

const Page = async () => {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return <div>Não autenticado</div>;

  const hasPermission = verifyAccess({
    pathname: "/gerenciar-trainees",
    user: authUser,
  });
  if (!hasPermission) return <DeniedAccess />;

  const [trainees, overview] = await Promise.all([
    getTrainees(),
    getTraineeOverview(),
  ]);

  return (
    <div className="md:p-8 p-4">
      <GerenciarTraineesContent
        initialTrainees={trainees}
        initialOverview={overview}
      />
    </div>
  );
};

export default Page;
