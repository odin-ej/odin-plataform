import ManageNotificationsContent from "@/app/_components/Dashboard/gerenciar-notificacoes/ManageNotificationsContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { getManagedNotifications } from "@/lib/actions/notifications";
import { prisma } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = constructMetadata({ title: "Gerenciar Notificações" });

const Page = async () => {
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({ pathname: "/gerenciar-notificacoes", user: user! });
  if (!hasPermission) return <DeniedAccess />;

  const [notifications, roles, users] = await Promise.all([
    getManagedNotifications(),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { isExMember: false },
      select: { id: true, name: true, imageUrl: true, emailEJ: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="md:p-8 p-4 overflow-x-auto">
      <ManageNotificationsContent
        initialNotifications={notifications}
        roles={roles}
        users={users}
      />
    </div>
  );
};

export default Page;
