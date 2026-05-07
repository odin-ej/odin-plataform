import AdminKrakenContent from "@/app/_components/Dashboard/admin-kraken/AdminKrakenContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { canAccessRoute } from "@/lib/actions/server-helpers";

export const metadata = constructMetadata({ title: "Kraken IA — Painel de Controle" });

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await getAuthenticatedUser();
  const hasPermission = await canAccessRoute(user!, "/admin-kraken");
  if (!hasPermission) return <DeniedAccess />;
  return <AdminKrakenContent />;
};

export default Page;
