/* eslint-disable @typescript-eslint/no-explicit-any */
// ChatHistorySheet.tsx

"use client";

import React, { useState, useMemo } from "react";
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
import { Conversation } from "@prisma/client"; // Importa o tipo do Prisma
import ModalConfirm from "../Global/ModalConfirm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface ChatHistorySheetProps {
  children: React.ReactNode;
  activeConversationId?: string; // O botão que irá acionar o painel
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

  // --- MUTAÇÃO PARA CRIAR UMA NOVA CONVERSA ---
  const { mutate: createConversation, isPending: isCreating } = useMutation({
    mutationFn: () => axios.post<Conversation>(`${API_URL}/api/conversations`),
    onSuccess: (response) => {
      const newConversation = response.data;
      toast.success("Nova conversa iniciada!");
      // Navega para a nova conversa e invalida o cache para atualizar a lista
      router.push(`/chat/${newConversation.id}`);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao criar conversa", {
        description: error.response?.data?.message,
      }),
  });

  // --- MUTAÇÃO PARA DELETAR UMA CONVERSA ---
  const { mutate: deleteConversation, isPending: isDeleting } = useMutation({
    mutationFn: (conversationId: string) =>
      axios.delete(`${API_URL}/api/conversations/${conversationId}`),
    // Usaremos onSettled para garantir que a lógica rode após sucesso ou erro
    onSuccess: (data, conversationId) => {
      toast.success("Conversa apagada com sucesso!");

      // Lógica de redirecionamento se a conversa ativa foi apagada
      if (activeConversationId === conversationId) {
        const remainingConversations = conversations.filter(
          (c) => c.id !== conversationId
        );
        if (remainingConversations.length > 0) {
          router.push(`/chat/${remainingConversations[0].id}`); // Vai para a primeira da lista
        } else {
          createConversation(); // Se não sobrar nenhuma, cria uma nova
        }
      }

      // Invalida a query para remover o item da lista
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao apagar", {
        description: error.response?.data?.message,
      }),
    onSettled: () => setConversationToDelete(null), // Fecha o modal de confirmação
  });

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
        <div className="relative">
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
          className="w-full bg-[#0126fb]/20 border border-[#0126fb] hover:bg-[#0126fb]/40"
          disabled={isCreating}
        >
          {isCreating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="mr-2 h-4 w-4" />
          )}
          Nova Conversa
        </Button>
        <div /* Lista de conversas */>
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-[#f5b719]" />
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <div key={conv.id} className="group ...">
                <Button
                  onClick={() => router.push(`/chat/${conv.id}`)} /* ... */
                >
                  {conv.title}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConversationToDelete(conv)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center ...">Nenhuma conversa encontrada.</p>
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
