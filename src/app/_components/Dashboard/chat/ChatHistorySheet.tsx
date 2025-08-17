/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Conversation } from "@prisma/client";
import ModalConfirm from "../../Global/ModalConfirm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { cn } from "@/lib/utils";

interface ChatHistorySheetProps {
  children: React.ReactNode;
  activeConversationId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ChatHistorySheet = ({
  children,
  activeConversationId,
}: ChatHistorySheetProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [conversationToDelete, setConversationToDelete] =
    useState<Conversation | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/conversations`);
      return data;
    },
  });

  const { mutate: createConversation, isPending: isCreating } = useMutation({
    mutationFn: () => axios.post<Conversation>(`${API_URL}/api/conversations`),
    onSuccess: (response) => {
      const newConversation = response.data;
      toast.success("Nova conversa iniciada!");
      router.push(`/chat/${newConversation.id}`);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao criar conversa", {
        description: error.response?.data?.message,
      }),
  });

  const { mutate: deleteConversation, isPending: isDeleting } = useMutation({
    mutationFn: (conversationId: string) =>
      axios.delete(`${API_URL}/api/conversations/${conversationId}`),
    onSuccess: () => {
      toast.success("Conversa apagada com sucesso!");
      // Apenas invalida a query para a lista ser atualizada.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao apagar", {
        description: error.response?.data?.message,
      }),
    onSettled: () => setConversationToDelete(null),
  });

  // ✅ HOOK ADICIONADO PARA LIDAR COM REDIRECIONAMENTO DE FORMA SEGURA
  useEffect(() => {
    // Verifica se já temos as conversas e um ID de conversa ativa
    if (conversations.length > 0 && activeConversationId) {
      // Procura se a conversa ativa ainda existe na lista de conversas
      const activeConversationExists = conversations.some(
        (c) => c.id === activeConversationId
      );

      // Se a conversa ativa NÃO existe mais (foi deletada)
      if (!activeConversationExists) {
        // Redireciona para a primeira conversa da lista
        router.push(`/chat/${conversations[0].id}`);
      }
    } else if (
      !isLoading &&
      conversations.length === 0 &&
      activeConversationId
    ) {
      // Caso especial: o usuário deletou a última conversa que existia
      createConversation();
    }
  }, [
    conversations,
    activeConversationId,
    isLoading,
    router,
    createConversation,
  ]);

  const filteredConversations = useMemo(() => {
    if (!searchTerm) return conversations;
    return conversations.filter((conv) =>
      conv.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  const handleDeleteConfirm = () => {
    if (conversationToDelete) {
      deleteConversation(conversationToDelete.id);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="right"
        className="bg-[#010d26] border-r-0 text-white p-4 w-[300px] sm:w-[350px]"
      >
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-[#f5b719]">
            Conversas
          </SheetTitle>
        </SheetHeader>
        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Pesquisar conversas..."
            className="bg-[#010d26] border-gray-700 pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button
          onClick={() => createConversation()}
          className="w-full !bg-[#0126fb]/20 border border-[#0126fb] hover:bg-[#0126fb]/40 mb-4"
          disabled={isCreating}
        >
          {isCreating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="mr-2 h-4 w-4" />
          )}
          Nova Conversa
        </Button>

        <div className="flex flex-col gap-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full pt-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#f5b719]" />
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className="group flex items-center justify-between rounded-md hover:bg-white/10"
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "flex-1 justify-start text-left h-auto whitespace-normal hover:bg-transparent hover:text-[#f5b719] p-2",
                    activeConversationId === conv.id && "bg-white/10"
                  )}
                  onClick={() => router.push(`/chat/${conv.id}`)}
                >
                  {conv.title}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setConversationToDelete(conv)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-gray-500 pt-10">
              Nenhuma conversa encontrada.
            </p>
          )}
        </div>
      </SheetContent>
      {conversationToDelete && (
        <ModalConfirm
          open={!!conversationToDelete}
          onCancel={() => setConversationToDelete(null)}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
          title="Confirmar Exclusão"
          description={`Tem certeza que deseja apagar a conversa "${conversationToDelete.title}"?`}
        />
      )}
    </Sheet>
  );
};

export default ChatHistorySheet;
