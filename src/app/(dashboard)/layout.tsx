import "../globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import AppSidebar from "../_components/Sidebar/app-sidebar";
import Header from "../_components/Global/Header";
import Footer from "../_components/Global/Footer";
import { AllowedActionsProvider } from "@/lib/auth/AllowedActionsProvider";
import { getUserAllowedActions } from "@/lib/actions/server-helpers";
import { getAuthenticatedUser } from "@/lib/server-utils";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  const user = await getAuthenticatedUser();
  const allowedActions = user ? await getUserAllowedActions(user) : [];

  return (
    <div className="flex min-h-screen overflow-hidden">
      <SidebarProvider defaultOpen={defaultOpen}>
        <AllowedActionsProvider allowedActions={allowedActions}>
          <AppSidebar />
          {/* CORREÇÃO: O 'main' agora é uma coluna flex que também ocupa toda a altura disponível */}
          <main className="flex flex-1 flex-col bg-[#00205e] overflow-x-auto">
            <Header />
            <SidebarTrigger />
            {/* CORREÇÃO: O conteúdo principal cresce para empurrar o footer para baixo */}
            <div className="flex-1">{children}</div>
            <Footer />
          </main>
        </AllowedActionsProvider>
      </SidebarProvider>
    </div>
  );
}
