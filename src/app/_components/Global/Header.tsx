"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import SearchCommand, { CommandGroupData } from "./Custom/SearchCommand";

import { generalLinks, personalLinks, restrictedLinks } from "@/lib/links";
import { useAllowedActions } from "@/lib/auth/AllowedActionsProvider";
import { AppAction } from "@/lib/permissions";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import NotificationCard from "./NotificationCard";
import {
  getNotifications,
  markNotificationsAsRead,
} from "@/lib/actions/notifications";

const Header = () => {
  const router = useRouter();
  const { user } = useAuth(); // Obtém o usuário do seu contexto de autenticação
  const { canDo } = useAllowedActions();

  // Hook useMemo para calcular os links pesquisáveis com base nas permissões do usuário.
  // Isso garante que a filtragem só seja executada quando o usuário mudar.
  const searchGroups = useMemo<CommandGroupData[]>(() => {
    if (!user) {
      // Se não houver usuário, retorna um array vazio para não mostrar nada na busca
      return [];
    }

    // 1. Links gerais (todos os membros veem)
    const filteredGeneralLinks = [...generalLinks];

    // 2. Links pessoais (todos os membros veem)
    const filteredPersonalLinks = [...personalLinks];

    // 3. Filtra os links restritos por permissão usando canDo
    const filteredRestrictedLinks = restrictedLinks.filter((link) =>
      link.requiredAction ? canDo(link.requiredAction) : canDo(AppAction.MANAGE_USERS)
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
  }, [user, router, canDo]);

  const queryClient = useQueryClient();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { mutate: markAllAsRead } = useMutation({
    mutationFn: () => markNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => getNotifications(10),
    enabled: !!user,
    refetchInterval: 30000,
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
