"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import LinksSidebar from "./LinksSidebar";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getInitials } from "@/lib/utils";
import { redirect } from "next/navigation";

const AppSidebar = () => {
  // O hook useAuth agora fornece um objeto `user` completo, com os dados
  // do seu banco de dados e os atributos do Cognito já combinados.
  const { user, logout } = useAuth();

  if (!user) redirect("/login");
  /**
   * Função auxiliar para extrair as iniciais de um nome.
   * @param name O nome completo do utilizador.
   * @returns As duas primeiras letras ou as iniciais do primeiro e último nome.
   */

  const userName = user?.name.split(" ") || "Utilizador";
  const formatedName = userName[0].concat(" ", userName[userName.length - 1]);
  const userImage = user?.imageUrl || ""; // A imagem vem do seu banco de dados.
  const userRole = user?.attributes?.["custom:role"] || "Cargo";

  // Exemplo de como você pode usar o `custom:isExMember`

  return (
    <Sidebar className="border-r-4 border-[#0126fb] bg-[#010d26]">
      <SidebarHeader className="text-center bg-[#010d26]">
        <Avatar className="mt-8 h-20 w-20 rounded-full border-2 border-white object-cover mx-auto">
          <AvatarImage
            className="object-cover"
            src={userImage}
            alt={`Foto de ${userName}`}
          />
          <AvatarFallback className="text-2xl font-bold">
            {getInitials(formatedName)}
          </AvatarFallback>
        </Avatar>

        <h2 className="mt-4 text-2xl text-white font-semibold">
          {formatedName}
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {user!.isExMember && (
            <p className="mt-2 max-w-fit rounded-full bg-[#f5b719]/10 px-2 py-1 text-xs font-semibold text-[#f5b719]">
              Ex-Membro
            </p>
          )}
          {!user.isExMember && (
            <p className="mt-2 max-w-fit rounded-full bg-[#f5b719]/10 px-2 py-1 text-xs font-semibold text-[#f5b719]">
              {userRole}
            </p>
          )}
          {user!.isExMember && user!.alumniDreamer && (
            <p className="mt-2 max-w-fit rounded-full bg-purple-600/10 px-2 py-1 text-xs font-semibold text-purple-500">
              Alumni Dreamer
            </p>
          )}
        </div>
      </SidebarHeader>

      <LinksSidebar />

      <SidebarFooter className="bg-[#010d26] px-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => logout()}
              className="hover:bg-white/10 cursor-pointer hover:text-[#f5b719] text-white transition-all duration-300 rounded-none"
            >
              <LogOut className="ml-2 mr-3 h-5 w-5" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
