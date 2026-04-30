import "../globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import AppSidebar from "../_components/Sidebar/app-sidebar";
import Header from "../_components/Global/Header";
import Footer from "../_components/Global/Footer";
import { AllowedActionsProvider } from "@/lib/auth/AllowedActionsProvider";
import {
  getUserAllowedActions,
  getUserAllowedRoutes,
} from "@/lib/actions/server-helpers";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { AppAction } from "@/lib/permissions";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  const user = await getAuthenticatedUser();
  let allowedActions: AppAction[] = [];
  let allowedRoutes: string[] = [];
  try {
    if (user) {
      // Carrega acoes e rotas em paralelo para nao gargalar o layout
      [allowedActions, allowedRoutes] = await Promise.all([
        getUserAllowedActions(user),
        getUserAllowedRoutes(user),
      ]);
    }
  } catch (error) {
    console.error("[layout] Failed to load allowed actions/routes:", error);
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      <SidebarProvider defaultOpen={defaultOpen}>
        <AllowedActionsProvider
          allowedActions={allowedActions}
          allowedRoutes={allowedRoutes}
        >
          <AppSidebar />
          {/* CORREÇÃO: O 'main' agora é uma coluna flex que também ocupa toda a altura disponível */}
          <main className="flex flex-1 flex-col bg-[#00205e] overflow-x-auto">
            <Header />
            
            {/* CORREÇÃO: O conteúdo principal cresce para empurrar o footer para baixo */}
            <div className="flex-1">{children}</div>
            <Footer />
          </main>
        </AllowedActionsProvider>
      </SidebarProvider>
    </div>
  );
}
