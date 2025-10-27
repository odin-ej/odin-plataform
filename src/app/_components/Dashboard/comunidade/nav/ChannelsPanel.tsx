/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DirectConversation } from "@prisma/client";
import { ArrowLeft, X } from "lucide-react";
import ContentSidebarLeft from "./ContentSidebarLeft";
import { FullUser } from "@/lib/server-utils";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import ChannelActionModal from "../ChannelActionModal";
import StartConversationModal from "../StartConversationModal";
import ModalConfirm from "@/app/_components/Global/ModalConfirm";
import UserSettingsModal from "../UserSettingsModal";
import { FullChannel } from "../ChannelContent";
import ChannelDetailsModal from "../ChannelDetailsModal";
import {
  deleteChannel,
  leaveConversation,
  deleteConversation,
} from "@/lib/actions/community";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ChannelsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  // Props necessárias para o ContentSidebarLeft
  user: FullUser;
  channels: FullChannel[];
  conversations: (DirectConversation & { participants: FullUser[] })[];
  allUsers: FullUser[];
}

const ChannelsPanel = ({
  isOpen,
  onClose,
  user,
  channels,
  conversations,
  allUsers,
}: ChannelsPanelProps) => {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<{
    type: string | null;
    data?: any;
  }>({ type: null });
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
          await deleteChannel({ channelId: data.id });
          return;
        case "leaveConversation":
          await leaveConversation({ conversationId: data.id });
          return;
        case "pinChannel":
          endpoint = `/api/community/channels/${data.id}/pin`;
          method = "patch";
          break;
        case "deleteConversation":
          await deleteConversation({ conversationId: data.id });
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
    if (["pinChannel"].includes(action)) {
      actionMutation({
        action,
        data: {
          id: data.channelId,
        },
      });
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
        "deleteConversation",
      ].includes(action)
    ) {
      setTimeout(() => setModalState({ type: action, data }), 50);
    }
    // Ações que disparam uma mutation diretamente (com confirmação)
    else {
      setModalState({ type: action, data });
    }
  };

  const router = useRouter();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-[#010d26] p-4 flex flex-col transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-400px-0 hover:bg-transparent hover:text-[#f5b719] transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </Button>
        <div className="flex items-center justify-between pb-4 border-b border-gray-700">
          <h2 className="font-bold text-lg text-white">Canais e Conversas</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>

        <ContentSidebarLeft
          user={user}
          channels={channels}
          conversations={conversations}
          onAction={handleAction} // Passa o handler local
        />
      </div>

      {/* RENDERIZAÇÃO DOS MODAIS CONTROLADOS LOCALMENTE */}
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

export default ChannelsPanel;
