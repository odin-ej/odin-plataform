import MinhasNotasContent from "@/app/_components/Dashboard/minhas-notas/MinhasNotasContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { getTraineeEvaluations } from "@/lib/actions/trainee";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Minhas Notas" });

const Page = async () => {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return <div>Não autenticado</div>;

  const hasPermission = verifyAccess({
    pathname: "/minhas-notas",
    user: authUser,
  });
  if (!hasPermission) return <DeniedAccess />;

  const evaluations = await getTraineeEvaluations();

  return (
    <div className="md:p-8 p-4">
      <MinhasNotasContent
        evaluations={evaluations}
        userName={authUser.name}
      />
    </div>
  );
};

export default Page;
