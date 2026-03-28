import MinhasNotasContent from "@/app/_components/Dashboard/minhas-notas/MinhasNotasContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { getTraineeEvaluations } from "@/lib/actions/trainee";
import { getNotifications } from "@/lib/actions/notifications";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { AreaRoles } from "@prisma/client";

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

  const [evaluations, initialNotifications] = await Promise.all([
    getTraineeEvaluations(),
    getNotifications(50),
  ]);

  const isTrainee = authUser.currentRole?.area?.includes(AreaRoles.TRAINEE) ?? false;

  return (
    <div className="md:p-8 p-4">
      <MinhasNotasContent
        evaluations={evaluations}
        userName={authUser.name}
        initialNotifications={initialNotifications}
        isTrainee={isTrainee}
      />
    </div>
  );
};

export default Page;
