/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import React, { useState } from "react";
import Image from "next/image";
import { FullUser } from "@/lib/server-utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import ContentSidebarLeft from "./ContentSidebarLeft"; // Importa o conteúdo reutilizável
import UserPhraseStatus from "../UserPhraseStatus";
import ChannelActionModal from "../ChannelActionModal";
import StartConversationModal from "../StartConversationModal";
import UserSettingsModal from "../UserSettingsModal";
import ModalConfirm from "@/app/_components/Global/ModalConfirm";
import { DirectConversation } from "@prisma/client";
import { FullChannel } from "../ChannelContent";
import ChannelDetailsModal from "../ChannelDetailsModal";
import { deleteChannel, leaveConversation, deleteConversation } from "@/lib/actions/community";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface CommunitySidebarLeftProps {
  channels: FullChannel[];
  conversations: (DirectConversation & { participants: FullUser[] })[];
  allUsers: FullUser[];
}

const CommunitySidebarLeft = ({
  channels,
  conversations,
  allUsers,
}: CommunitySidebarLeftProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<{
    type: string | null;
    data?: any;
  }>({ type: null });

  // --- MUTATIONS ---
  const { mutate: actionMutation, isPending } = useMutation({
    mutationFn: async ({ action, data }: { action: string; data: any }) => {
      let endpoint = "";
      let method: "post" | "patch" | "delete" = "post";

      switch (action) {
        case "createChannel":
          endpoint = "/api/community/channels";
          method = "post";
          break;
        case "deleteChannel":
          await deleteChannel({channelId: data.id})
          return;
        case "leaveConversation":
          await leaveConversation({conversationId: data.id})
          return;
        case 'pinChannel':
          endpoint = `/api/community/channels/${data.id}/pin`;
          method = "patch";
          break;
        case "deleteConversation":
          await deleteConversation({conversationId: data.id})
          return;
        // Adicione outras mutations aqui
      }
      return (axios as any)[method](`${API_URL}${endpoint}`, data);
    },
    onSuccess: () => {
      toast.success("Ação realizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["communityData"] }); // Invalida os dados do layout
      setModalState({ type: null }); // Fecha qualquer modal aberto
    },
    onError: (e: AxiosError<{ message: string }>) =>
      toast.error("Falha na operação", {
        description: e.response?.data?.message,
      }),
  });

  const handleAction = (action: string, data?: any) => {
    //Ações que disparam sem confirmação
    if(['pinChannel'].includes(action)){
      actionMutation({
        action,
        data: {
          id: data.channelId
        },
      })
    }
    // Ações que abrem um modal
    if (
      [
        "createChannel",
        "editChannel",
        "viewChannel",
        "userSettings",
        "viewProfile",
        "createConversation",
        "leaveConversation",
        'deleteChannel',
        "deleteConversation"
      ].includes(action)
    ) {
      setTimeout(() => setModalState({ type: action, data }), 50);
    }
    // Ações que disparam uma mutation diretamente (com confirmação)
    else {
      setModalState({ type: action, data });
    }
  };

  if (!user) return null;

  return (
    <>
      <aside className="w-64 bg-[#010d26] p-4 flex-col justify-between border-r-2 border-[#f5b719] relative hidden lg:flex">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800/50 ">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-400px-0 hover:bg-transparent hover:text-[#f5b719] transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </Button>
          <Image
            width={32}
            height={32}
            src="/logo-amarela.png"
            alt="Logo"
            className="object-contain"
          />
        </div>

        <ContentSidebarLeft
          user={user as FullUser}
          channels={channels}
          conversations={conversations}
          onAction={handleAction}
        />

        <div className="p-2 bg-black/20 rounded-lg flex items-center justify-between mt-4 relative">
          {user.phraseStatus && (
            <UserPhraseStatus phraseStatus={user.phraseStatus} />
          )}
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 border-2 border-[#f5b719]">
              <AvatarImage src={user.imageUrl} />
              <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold truncate text-white">
                {user.name.split(" ")[0]}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user.currentRole?.name}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAction("userSettings", user)}
            className="h-7 w-7 text-gray-400 hover:text-[#f5b719]"
          >
            <Settings size={16} />
          </Button>
        </div>
      </aside>

      {/* RENDERIZAÇÃO DOS MODAIS */}
      {modalState.type === "createChannel" && (
        <ChannelActionModal
          isOpen={true}
          onClose={() => setModalState({ type: null })}
          action={"create"}
          channel={modalState.data?.channel}
          allUsers={allUsers}
          onConfirm={(data: any) =>
            actionMutation({
              action: modalState.type as any,
              data: { ...data, id: modalState.data?.channel?.id },
            })
          }
          isLoading={isPending}
        />
      )}
      {(modalState.type === "viewChannel" ||
        modalState.type === "editChannel") && (
        <ChannelDetailsModal
          isOpen={true}
          onClose={() => setModalState({ type: null })}
          channel={modalState.data?.channel}
          currentUserId={user.id}
        />
      )}
      {modalState.type === "createConversation" && (
        <StartConversationModal
          isOpen={true}
          onClose={() => setModalState({ type: null })}
          allUsers={allUsers.filter((u: FullUser) => u.id !== user.id)}
        />
      )}
      {modalState.type === "viewProfile" && (
        <UserSettingsModal
          isOpen={true}
          onClose={() => setModalState({ type: null })}
          user={modalState.data}
          isCurrentUser={user.id === modalState.data.id}
        />
      )}
      {modalState.type === "userSettings" && (
        <UserSettingsModal
          isOpen={true}
          onClose={() => setModalState({ type: null })}
          user={modalState.data}
          isCurrentUser={user.id === modalState.data.id}
        />
      )}

      {/* Modais de Confirmação */}
      {(modalState.type === "deleteChannel" ||
        modalState.type === "deleteConversation") && (
        <ModalConfirm
          open={true}
          onCancel={() => setModalState({ type: null })}
          onConfirm={() =>
            actionMutation({
              action: modalState.type as any,
              data: modalState.data,
            })
          }
          isLoading={isPending}
          title={`Confirmar Ação`}
          description={`Tem certeza que deseja ${
            modalState.type === "deleteChannel"
              ? "deletar este canal"
              : "realizar esta ação"
          }?`}
        />
      )}
    </>
  );
};
export default CommunitySidebarLeft;
