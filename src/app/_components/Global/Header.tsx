"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import SearchCommand, { CommandGroupData } from "./Custom/SearchCommand";

import { generalLinks, personalLinks, restrictedLinks } from "@/lib/links";
import { checkUserPermission } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Prisma } from "@prisma/client";
import NotificationCard from "./NotificationCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type NotificationType = Prisma.NotificationUserGetPayload<{
  include: { notification: true };
}>;

const Header = () => {
  const router = useRouter();
  const { user } = useAuth(); // Obtém o usuário do seu contexto de autenticação

  // Hook useMemo para calcular os links pesquisáveis com base nas permissões do usuário.
  // Isso garante que a filtragem só seja executada quando o usuário mudar.
  const searchGroups = useMemo<CommandGroupData[]>(() => {
    if (!user) {
      // Se não houver usuário, retorna um array vazio para não mostrar nada na busca
      return [];
    }

    // 1. Filtra os links gerais
    const filteredGeneralLinks = generalLinks.filter((link) => {
      if (link.exMemberCanAccess === false && user.isExMember) {
        return false;
      }
      return true;
    });

    // 2. Filtra os links pessoais
    const filteredPersonalLinks = personalLinks.filter((link) => {
      if (link.exMemberCanAccess === false && user.isExMember) {
        return false;
      }
      return true;
    });

    // 3. Filtra os links restritos
    const filteredRestrictedLinks = restrictedLinks.filter((link) =>
      checkUserPermission(user, {
        allowedRoles: link.roles.map((r) => r.name),
        allowedAreas: link.areas,
        allowExMembers: link.exMemberCanAccess === true,
      })
    );

    // 4. Combina todos os links permitidos em um único array
    const allAllowedLinks = [
      ...filteredGeneralLinks,
      ...filteredPersonalLinks,
      ...filteredRestrictedLinks,
    ];

    return [
      {
        heading: "Páginas",
        items: allAllowedLinks.map((link) => ({
          label: link.name,
          icon: link.icon,
          action: () => router.push(link.href),
        })),
      },
    ];
  }, [user, router]);

  const queryClient = useQueryClient();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { mutate: markAllAsRead } = useMutation({
    mutationFn: async () => {
      await axios.patch(
        `${API_URL}/api/users/${user!.id}/notifications/mark-all-read`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const notifications = await axios.get(
        `${API_URL}/api/users/${user!.id}/notifications`
      );
      return notifications.data as NotificationType[];
    },
  });

  return (
    <header className="flex items-center justify-between px-4 bg-[#010d26] h-16 border-b-2 border-[#0126fb]">
      <SearchCommand
        groups={searchGroups}
        placeholder="Pesquisar páginas..."
        triggerLabel="Para onde você quer ir?"
      />
      <div className="flex gap-6 items-center relative">
        <Popover
          open={isPopoverOpen}
          onOpenChange={(open) => {
            setIsPopoverOpen(open);
            if (open) {
              markAllAsRead(); // Marca como lidas ao abrir
            }
          }}
        >
          <PopoverTrigger className="relative h-12 w-12" asChild>
            <div className="w-full h-full">
              {notifications?.some((n) => !n.isRead) && (
                <span className="absolute top-[-4px] right-[-4px] bg-[#f5b719] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md border border-white">
                  {notifications.filter((n) => !n.isRead).length}
                </span>
              )}
              <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-white cursor-pointer bg-[#00205e] hover:bg-[#0126fb] hover:text-white transition-all duration-200 rounded-full p-2.5 shadow-md" />
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent w-[420px] max-h-[500px] overflow-y-auto bg-gradient-to-br from-[#001740] via-[#00205e] to-[#001940] border border-[#0126fb] text-white shadow-2xl p-4 rounded-xl backdrop-blur-md animate-in fade-in zoom-in"
            sideOffset={12}
            align="end"
          >
            {notifications && notifications.length > 0 ? (
              notifications.map((n) => (
                <NotificationCard key={n.id} notificationUser={n} />
              ))
            ) : (
              <p className="text-sm text-white">Nenhuma notificação.</p>
            )}
          </PopoverContent>
        </Popover>

        <Image
          src="/Logo.png"
          alt="Logo da Casinha"
          width={100}
          height={50}
          className="cursor-pointer"
          onClick={() => router.push("/")}
        />
      </div>
    </header>
  );
};

export default Header;
