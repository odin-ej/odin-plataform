import "../globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import AppSidebar from "../_components/Sidebar/app-sidebar";
import Header from "../_components/Global/Header";
import Footer from "../_components/Global/Footer";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <div className="flex min-h-screen overflow-hidden">
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        {/* CORREÇÃO: O 'main' agora é uma coluna flex que também ocupa toda a altura disponível */}
        <main className="flex flex-1 flex-col bg-[#00205e] overflow-x-auto">
          <Header />
          <SidebarTrigger />
          {/* CORREÇÃO: O conteúdo principal cresce para empurrar o footer para baixo */}
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
      </SidebarProvider>
    </div>
  );
}
