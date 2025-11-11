// components/NotificationPanel.tsx
"use client";

import { Bell, Loader2, Info, UserPlus } from "lucide-react"; // Importe os ícones que precisar
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider"; // Assumindo que você tenha
import {
  getNotifications,
  markNotificationsAsRead,
  FullNotification,
} from "@/lib/actions/notifications"; // Importe as actions e o tipo
import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { NotificationType } from "@prisma/client"; // Importe seu enum

/**
 * Componente auxiliar para renderizar o ícone correto
 */
const NotificationIcon = ({ type }: { type: NotificationType | string }) => {
  switch (type) {
    case "NEW_MENTION": // Use os tipos do seu enum
      return <UserPlus className="h-5 w-5 text-[#f5b719] flex-shrink-0" />;
    // case 'BIRTHDAY':
    //   return <Gift className="h-5 w-5 text-pink-400 flex-shrink-0" />;
    default:
      return <Info className="h-5 w-5 text-[#0126fb] flex-shrink-0" />;
  }
};

/**
 * Componente auxiliar para renderizar um item da lista
 */
const NotificationItem = ({ item }: { item: FullNotification }) => (
  <Link href={item.notification.link ?? "#"} passHref>
    <div
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-white/5 rounded-md transition-colors cursor-pointer",
        !item.isRead && "bg-[#f5b719]/10 hover:bg-[#f5b719]/20" // Destaque para não lido
      )}
    >
      <NotificationIcon type={item.notification.type as string} />
      <div className="flex-1 overflow-hidden">
        <p
          className={cn(
            "text-sm text-gray-200",
            !item.isRead && "font-bold text-white"
          )}
        >
          {item.notification.notification}
        </p>
        <p className="text-xs text-gray-400">
          {formatDistanceToNow(new Date(item.notification.createdAt), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>
      {!item.isRead && (
        <div className="h-2.5 w-2.5 rounded-full bg-[#f5b719] mt-1.5 flex-shrink-0" />
      )}
    </div>
  </Link>
);

// --- Componente Principal ---
const NotificationPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // 1. Busca as notificações
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id], // Chave de query por usuário
    queryFn: () => getNotifications(10), // Busca as últimas 10
    enabled: !!user, // Só executa se o usuário estiver carregado
    refetchInterval: 60000, // Atualiza a cada 1 minuto
    refetchOnWindowFocus: true,
  });

  // 2. Mutação para marcar como lido
  const { mutate: markAsRead } = useMutation({
    mutationFn: markNotificationsAsRead,
    onSuccess: () => {
      // Revalida os dados da query para remover o badge e atualizar a UI
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // 3. Calcula dados derivados
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const latestNotification = notifications?.[0]?.notification;

  // 4. Handler para abrir/fechar e marcar como lido
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      // Marca como lido um pouco depois de abrir (para UX não ser abrupto)
      setTimeout(() => markAsRead(), 1000);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {/* Este é o painel visível que você pediu */}
        <Button
          variant="ghost"
          className="w-full h-auto justify-between items-center text-left py-2 px-3 rounded-lg bg-[#010d26] min-h-[100px] hover:bg-[#010d26]/80 transition-colors"
        >
          <div className="flex items-center gap-6 overflow-hidden px-4">
            <div className="relative">
              <Bell
                className="!h-8 !w-8 md:!h-12 md:!w-12 text-[#f5b719]"
              />
              {/* Badge numérico de Notificações Não Lidas */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 flex h-4 w-4">
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[#f5b719] justify-center items-center text-black text-md font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </span>
              )}
            </div>
            {/* Mensagem da Última Notificação */}
            <div className="overflow-hidden">
              <span className="text-lg lg:text-md md:text-xs text-gray-400 block">
                Notificações
              </span>
              {isLoading ? (
                <p className="text-md text-gray-500 truncate">Carregando...</p>
              ) : latestNotification ? (
                <p
                  className={cn(
                    "text-xl lg:text-lg md:text-md sm:text-sm truncate",
                    unreadCount > 0
                      ? "text-white font-semibold"
                      : "text-gray-300" // Destaque se houver não lidas
                  )}
                >
                  {latestNotification.notification}
                </p>
              ) : (
                <p className="text-md text-gray-400 truncate">
                  Nenhuma novidade por aqui.
                </p>
              )}
            </div>
          </div>
        </Button>
      </PopoverTrigger>

      {/* Conteúdo do Dropdown */}
      <PopoverContent
        align="end" // Alinha à direita (ajuste 'start' se estiver na esquerda)
        sideOffset={4}
        className="w-[280px] sm:w-[450px] md:w-[550px] lg:w-[650px]  bg-[#010d26] text-white border-gray-700 p-2 shadow-lg"
      >
        <div className="flex justify-between items-center p-2">
          <h3 className="font-semibold">Notificações</h3>
        </div>

        <div className="w-[280px] sm:w-[450px] md:w-[550px] lg:w-[650px] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 pr-1">
          {isLoading && (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}
          {!isLoading && notifications && notifications.length > 0 ? (
            <div className="flex flex-col gap-1">
              {notifications.map((item) => (
                <NotificationItem key={item.id} item={item} />
              ))}
            </div>
          ) : (
            !isLoading && (
              <p className="text-sm text-gray-500 text-center py-4">
                Você não tem nenhuma notificação.
              </p>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPanel;
