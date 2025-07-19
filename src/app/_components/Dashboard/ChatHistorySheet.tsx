// ChatHistorySheet.tsx

"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Conversation } from ".prisma/client"; // Importa o tipo do Prisma
import { cn } from "@/lib/utils";
import ModalConfirm from "../Global/ModalConfirm";

interface ChatHistorySheetProps {
  children: React.ReactNode;
  activeConversationId?: string; // O botão que irá acionar o painel
}

const ChatHistorySheet = ({
  children,
  activeConversationId,
}: ChatHistorySheetProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const router = useRouter();

  // Efeito para buscar o histórico de conversas quando o painel é aberto
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/conversations")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao buscar histórico.");
        return res.json();
      })
      .then((data) => setConversations(data))
      .catch(() =>
        toast.error("Não foi possível carregar o seu histórico de conversas.")
      )
      .finally(() => setIsLoading(false));
  }, []);

  // Função para criar uma nova conversa
  const handleNewConversation = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/conversations", { method: "POST" });
      const newConversation = await response.json();
      if (!response.ok) throw new Error("Falha ao criar uma nova conversa.");

      toast.success("Nova conversa iniciada!");
      router.push(`/chat/${newConversation.id}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Erro", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  // Filtra as conversas com base no termo de pesquisa
  const filteredConversations = useMemo(() => {
    if (!searchTerm) return conversations;
    return conversations.filter((conv) =>
      conv.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  const handleDeleteConversation = async (conversationId: string) => {
    if(isDeleteLoading) return;
    try {
      setIsDeleteLoading(true)
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Falha ao apagar a conversa.");

      // Encontra o índice da conversa que foi apagada
      const deletedIndex = conversations.findIndex(
        (c) => c.id === conversationId
      );
      // Atualiza o estado local para remover a conversa da UI imediatamente
      const updatedConversations = conversations.filter(
        (c) => c.id !== conversationId
      );
      setConversations(updatedConversations);

      toast.success("Conversa apagada com sucesso!");

      // Se a conversa apagada era a que estava ativa, decide para onde navegar
      if (activeConversationId === conversationId) {
        if (updatedConversations.length > 0) {
          // Se ainda houver conversas, navega para a próxima disponível
          // (ou para a última da lista se a apagada era a última)
          const nextIndex = Math.min(
            deletedIndex,
            updatedConversations.length - 1
          );
          router.push(`/chat/${updatedConversations[nextIndex].id}`);
        } else {
          // Se não houver mais conversas, cria uma nova
          handleNewConversation();
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Erro ao apagar", { description: error.message });
    }
    setIsModalOpen(false);
    setIsDeleteLoading(false)
  };

  const handleDeleteClick = (conversationId: string) => {
    setIsModalOpen(true);
    setSelectedConversationId(conversationId);
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
        <div className="mt-4 space-y-4">
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
            onClick={handleNewConversation}
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

          {/* Lista de conversas com scroll */}
          <div
            className="flex flex-col gap-2 mt-4 overflow-y-auto"
            style={{ height: "calc(100vh - 180px)" }}
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
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
                      "flex-1 justify-start text-left h-auto whitespace-normal hover:bg-transparent hover:text-[#f5b719]",
                      activeConversationId === conv.id && "bg-white/10"
                    )}
                    onClick={() => router.push(`/chat/${conv.id}`)}
                  >
                    {conv.title}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-red-500/10"
                    onClick={() => handleDeleteClick(conv.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-gray-400 mt-8">
                Nenhuma conversa encontrada.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
      <ModalConfirm
        onCancel={() => setIsModalOpen(false)}
        onConfirm={() => handleDeleteConversation(selectedConversationId!)}
        open={isModalOpen}
        isLoading={isDeleteLoading}
      />
    </Sheet>
  );
};

export default ChatHistorySheet;
