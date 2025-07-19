import "../globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cookies, headers } from "next/headers";
import AppSidebar from "../_components/Sidebar/app-sidebar";
import Header from "../_components/Global/Header";
import Footer from "../_components/Global/Footer";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { redirect } from "next/navigation";
import { ROUTE_PERMISSIONS } from "@/lib/permissions";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers(); 
  const pathname = headersList.get('x-next-pathname');

  if (pathname) {
    // 3. Verificar se a rota atual precisa de uma verificação de permissão.
    const requiredPermission = ROUTE_PERMISSIONS[pathname];

    if (requiredPermission) {
      // 4. Se uma permissão é necessária, busca os dados do usuário.
      const user = await getAuthenticatedUser();

      // 5. Executa a verificação.
      const hasPermission = checkUserPermission(user, requiredPermission);

      // 6. Se o usuário não tiver permissão, redireciona para a página inicial.
      if (!hasPermission) {
        redirect("/");
      }
    }
  }

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
