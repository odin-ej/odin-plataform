import AdminKrakenContent from "@/app/_components/Dashboard/admin-kraken/AdminKrakenContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { constructMetadata } from "@/lib/metadata";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";

export const metadata = constructMetadata({ title: "Kraken IA — Painel de Controle" });

export const dynamic = "force-dynamic";

const Page = async () => {
  const user = await getAuthenticatedUser();
  const hasPermission = verifyAccess({ pathname: "/admin-kraken", user: user! });
  if (!hasPermission) return <DeniedAccess />;
  return <AdminKrakenContent />;
};

export default Page;
