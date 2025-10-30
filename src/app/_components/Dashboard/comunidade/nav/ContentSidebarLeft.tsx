/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChannelType, DirectConversation } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FullUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Hash,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  UserCog,
  LayoutDashboard,
} from "lucide-react";
import { FullChannel } from "../ChannelContent";
import { getCommunityFileSignedUrl } from "@/lib/actions/community";
import { useEffect, useState } from "react";

interface ContentSidebarLeftProps {
  user: FullUser;
  channels: FullChannel[];
  conversations: (DirectConversation & { participants: FullUser[] })[];
  onAction: (action: string, data?: any) => void;
}

const ContentSidebarLeft = ({
  user,
  channels,
  conversations,
  onAction,
}: ContentSidebarLeftProps) => {
  const pathname = usePathname();
  const [isLoadingUrls, setIsLoadingUrls] = useState(true);

  const isActive = (href: string) => pathname === href;
  const isDirector = checkUserPermission(user!, DIRECTORS_ONLY);
  //Somente donos podem editar/deletar canais
  const canEditChannel = (channel: FullChannel) =>
    user.id === channel.createdById ||
    isDirector ||
    channel.members.some((m) => m.userId === user.id && m.role === "ADMIN");

  const canDeleteChannel = (channel: FullChannel) =>
    user.id === channel.createdById || isDirector;

  const [signedUrlImages, setSignedUrlImages] = useState<
    Record<string, string>
  >({});

  const visibleChannels = channels.filter((channel) => {
    // Regra 5: Exclui ex-membro se não permitido pelo canal
    if (user.isExMember && !channel.allowExMembers) return false;

    // --- Lógica para Canal PRIVADO ---
    if (channel.type === ChannelType.PRIVATE) {
      // Regra 4: Visível APENAS se o usuário for membro explícito
      // (A exceção do Diretor já foi tratada acima)
      // Corrigido para checar m.userId
      const isMember = channel.members?.some((m) => m.userId === user.id);
      return !!isMember; // Retorna true apenas se for membro
    }

    // --- Lógica para Canal PÚBLICO ---
    // (channel.type === ChannelType.PUBLIC)
    else {
      // Regra 2: Se não há restrições de área, é visível
      // (O caso do ex-membro já foi tratado pela Regra 5)
      if (
        !channel.restrictedToAreas ||
        channel.restrictedToAreas.length === 0
      ) {
        return true;
      }

      // Verifica se alguma área do usuário bate com as áreas restritas do canal
      // Assumindo que user.currentRole.area é AreaRoles[]
      const hasMatchingArea = channel.restrictedToAreas.some((restrictedArea) =>
        user.currentRole?.area?.includes(restrictedArea)
      );
      return hasMatchingArea;
    }
  });

  useEffect(() => {
    //Preciso passar pelos canais que possuem imagem e usar o getCommunityFileSignUrl
    const fetchSignedUrls = async () => {
      setIsLoadingUrls(true);
      const urls: Record<string, string> = {};

      const pinnedChannels = channels.filter(
        (channel) => channel.isPinned && channel.imageUrl !== null
      );

      for (const channel of pinnedChannels) {
        if (!channel.imageUrl) continue;
        const signedUrl = await getCommunityFileSignedUrl(channel.imageUrl);
        urls[channel.id] = signedUrl;
      }

      setSignedUrlImages(urls);
      setIsLoadingUrls(false);
    };
    fetchSignedUrls();
  }, [channels]);

  const mainNavItems = [
    { name: "Feed", icon: LayoutDashboard, href: "/comunidade/feed" },
  ];
  const pinnedChannels = visibleChannels.filter((c) => c.isPinned);
  const regularChannels = visibleChannels.filter((c) => !c.isPinned);

  const visibleConversations = conversations.filter((conv) => {
    // Inclui a conversa se o usuário for participante
    return conv.participants.some((p) => p.id === user.id);
  });

  return (
    <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700/50 pr-2 space-y-4">
      <nav className="mt-2">
        {mainNavItems.map((item) => (
          <Link href={item.href} key={item.name} passHref>
            <span
              className={cn(
                "flex items-center gap-3 p-2 rounded-md text-gray-300 hover:bg-white/5 font-medium",

                isActive(item.href) && "bg-[#f5b719]/20 text-[#f5b719]"
              )}
            >
              <item.icon size={20} />

              <span>{item.name}</span>
            </span>
          </Link>
        ))}
      </nav>
      <Accordion
        type="multiple"
        defaultValue={["destaque", "channels", "conversations"]}
        className="w-full space-y-2"
      >
        {/* Destaques */}
        <AccordionItem value="destaque" className="border-b-0">
          <AccordionTrigger className="text-xs font-bold uppercase text-gray-500 hover:no-underline p-2">
            Destaque
          </AccordionTrigger>
          <AccordionContent className="pt-1 space-y-1">
            {pinnedChannels.map((channel) => (
              <ContextMenu key={channel.id}>
                <ContextMenuTrigger>
                  <Link href={`/comunidade/canais/${channel.id}`} passHref>
                    <span
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md text-gray-300 hover:bg-white/5",
                        isActive(`/comunidade/canais/${channel.id}`) &&
                          "bg-white/10 text-white font-semibold"
                      )}
                    >
                      {channel.imageUrl && !isLoadingUrls ? (
                        <Image
                          src={signedUrlImages[channel.id] ?? null}
                          width={20}
                          height={20}
                          alt={channel.name}
                          className="rounded-full"
                        />
                      ) : (
                        <Hash size={16} />
                      )}
                      <span className="truncate">{channel.name}</span>
                    </span>
                  </Link>
                </ContextMenuTrigger>
                <ContextMenuContent className="bg-[#010d26] text-white border-gray-700">
                  <ContextMenuItem
                    onSelect={() => onAction("viewChannel", { channel })}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </ContextMenuItem>
                  {isDirector && (
                    <ContextMenuItem
                      onSelect={() =>
                        onAction("pinChannel", {
                          channelId: channel.id,
                          isPinned: false,
                        })
                      }
                    >
                      <PinOff className="mr-2 h-4 w-4" />
                      Remover do Destaque
                    </ContextMenuItem>
                  )}
                  {canEditChannel(channel) && (
                    <ContextMenuItem
                      onSelect={() => onAction("editChannel", { channel })}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </ContextMenuItem>
                  )}

                  {canDeleteChannel(channel) && (
                    <ContextMenuItem
                      onSelect={() => onAction("deleteChannel", channel)}
                      className="text-red-500"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Deletar
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            ))}
            {pinnedChannels.length === 0 && (
              <span className="px-2 text-xs text-gray-500">
                Nenhum canal em destaque.
              </span>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Canais */}
        <AccordionItem value="channels" className="border-b-0">
          <AccordionTrigger className="text-xs font-bold uppercase text-gray-500 hover:no-underline p-2 flex justify-between">
            <span>Canais</span>

            <span
              onClick={(e) => {
                e.stopPropagation();
                onAction("createChannel");
              }}
              className="hover:text-white"
            >
              <Plus size={16} />
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-1 space-y-1">
            {regularChannels.map((channel) => (
              <ContextMenu key={channel.id}>
                <ContextMenuTrigger>
                  <Link href={`/comunidade/canais/${channel.id}`} passHref>
                    <span
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md text-gray-400 hover:bg-white/5 hover:text-white",
                        isActive(`/comunidade/canais/${channel.id}`) &&
                          "bg-white/10 text-white font-semibold"
                      )}
                    >
                      <Hash size={16} /> {channel.name}
                    </span>
                  </Link>
                </ContextMenuTrigger>
                <ContextMenuContent className="bg-[#010d26] text-white border-gray-700">
                  <ContextMenuItem
                    onSelect={() => onAction("viewChannel", { channel })}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </ContextMenuItem>
                  {isDirector && (
                    <ContextMenuItem
                      onSelect={() =>
                        onAction("pinChannel", {
                          channelId: channel.id,
                          isPinned: true,
                        })
                      }
                    >
                      <Pin className="mr-2 h-4 w-4" />
                      Fixar no Destaque
                    </ContextMenuItem>
                  )}
                  {canEditChannel(channel) && (
                    <ContextMenuItem
                      onSelect={() => onAction("editChannel", { channel })}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </ContextMenuItem>
                  )}

                  {canDeleteChannel(channel) && (
                    <ContextMenuItem
                      onSelect={() => onAction("deleteChannel", channel)}
                      className="text-red-500"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Deletar
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* Conversas */}
        <AccordionItem value="conversations" className="border-b-0">
          <AccordionTrigger className="text-xs font-bold uppercase text-gray-500 hover:no-underline p-2 flex justify-between">
            <span>Conversas</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onAction("createConversation");
              }}
              className="hover:text-white"
            >
              <Plus size={16} />
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-1 space-y-1">
            {visibleConversations.map((conv) => {
              // 1. Filtra para pegar TODOS os outros participantes, não apenas o primeiro
              const otherParticipants = conv.participants.filter(
                (p) => p.id !== user.id
              );
              if (otherParticipants.length === 0) return null;

              // 2. Determina o nome a ser exibido
              // Se for 1-a-1, mostra o nome da outra pessoa. Se for em grupo, mostra o título ou os nomes.
              const displayName =
                conv.title ||
                (otherParticipants.length > 1
                  ? otherParticipants
                      .map((p) => p.name.split(" ")[0])
                      .slice(0, 2)
                      .join(", ") + "..."
                  : otherParticipants[0].name);

              return (
                <ContextMenu key={conv.id}>
                  <ContextMenuTrigger>
                    <div className="flex items-center gap-2 p-2 rounded-md text-gray-300 hover:bg-white/5 cursor-pointer">
                      {/* --- LÓGICA DE AVATARES MÚLTIPLOS --- */}
                      <div className="flex -space-x-3 items-center">
                        {otherParticipants
                          .slice(0, 3)
                          .map((participant, index) => (
                            <Avatar
                              key={participant.id}
                              className={`h-6 w-6 border-2 border-[#010d26] z-${
                                (3 - index) * 10
                              }`}
                            >
                              <AvatarImage src={participant.imageUrl} />
                              <AvatarFallback className="text-xs">
                                {participant.name.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        {/* Mostra um indicador se houver mais de 3 participantes */}
                        {otherParticipants.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold border-2 border-[#010d26] z-0">
                            +{otherParticipants.length - 3}
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/comunidade/conversas/${conv.id}`}
                        className="truncate"
                      >
                        {displayName}
                      </Link>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="bg-[#010d26] text-white border-gray-700">
                    {otherParticipants.length === 1 && (
                      <ContextMenuItem
                        onSelect={() =>
                          onAction("viewProfile", otherParticipants[0])
                        }
                      >
                        <UserCog className="h-4 w-4 mr-2" /> Ver Perfil
                      </ContextMenuItem>
                    )}
                    {user.id === conv.createdById ? (
                      <ContextMenuItem
                        onSelect={() => onAction("deleteConversation", conv)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Apagar Conversa
                      </ContextMenuItem>
                    ) : (
                      <ContextMenuItem
                        onSelect={() => onAction("leaveConversation", conv)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Sair
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
export default ContentSidebarLeft;
