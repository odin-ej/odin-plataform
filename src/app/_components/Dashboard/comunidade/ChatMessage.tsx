/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CustomEmoji } from "@prisma/client";
import { Pencil, Trash2, Loader2, MessageCircleReply } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  decryptMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
} from "@/lib/actions/community"; // Confirme o caminho
import CustomEmojiImage from "./CustomEmojiImage";
import { useAuth } from "@/lib/auth/AuthProvider";
// 👇 Importa o tipo unificado FullMessage
import { FullMessage } from "./MessageInput"; // Ou de onde você o definiu
import ReactionPopover from "./ReactionPopover";
import RenderParentMessage from "./RenderParentMessage";
import RenderMessageContent from "./RenderMessageContent";
import RenderAttachment from "./RenderAttachment";

// --- TIPAGEM ---
type ContextType = "direct" | "channel";

interface ChatMessageProps {
  message: FullMessage;
  isOwner: boolean;
  customEmojis: CustomEmoji[];
  onReply: (message: FullMessage) => void;
  contextType: ContextType; // <-- Nova prop
  contextId: string; // <-- Nova prop
}

// (FullMessageReaction pode ser removido daqui se não usado diretamente)

const ChatMessage = ({
  message,
  isOwner,
  customEmojis,
  onReply,
  contextType, // <-- Recebe a prop
  contextId, // <-- Recebe a prop
}: ChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    // A descriptografia não depende do tipo
    decryptMessage(message.content).then((plainText) => {
      setDecryptedContent(plainText);
      setEditedContent(plainText);
    });
  }, [message.content]);

  // Define a chave de query baseada no contexto
  const queryKey = [contextType, contextId]; // Ex: ['direct', 'conv123'] ou ['channel', 'chan456']

  // --- Mutações Adaptadas ---
  const { mutate: editMessageMutation, isPending: isEditingMessage } =
    useMutation({
      // Passa contextType para a action
      mutationFn: (newContent: string) =>
        editMessage(message.id, newContent, contextType),
      onSuccess: () => {
        toast.success("Mensagem editada.");
        setIsEditing(false);
        // Usa a queryKey definida
        queryClient.invalidateQueries({ queryKey });
      },
      onError: (err: any) =>
        toast.error("Falha ao editar", { description: err.message }),
    });

  const { mutate: deleteMessageMutation } = useMutation({
    // Passa contextType para a action
    mutationFn: () => deleteMessage(message.id, contextType),
    onSuccess: () => {
      toast.success("Mensagem deletada.");
      // Usa a queryKey definida (não precisa invalidar se a mensagem some)
      // queryClient.invalidateQueries({ queryKey });
    },
    // Opcional: Atualizar a UI otimisticamente ou refetch
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) =>
      toast.error("Falha ao deletar", { description: err.message }),
  });

  const { mutate: toggleReactionMutation } = useMutation({
    // Passa contextType para a action
    mutationFn: (reaction: { emoji?: string; customEmojiId?: string }) =>
      toggleReaction(message.id, reaction, contextType),
    onSuccess: () => {
      // Usa a queryKey definida
      queryClient.invalidateQueries({ queryKey });
    },
    // Pode adicionar onMutate para atualização otimista da UI
    onError: (err: any) =>
      toast.error("Falha ao reagir", { description: err.message }),
  });

  

  return (
    <div
      className={cn(
        "flex gap-3 group",
        isOwner ? "justify-end" : "justify-start"
      )}
    >
      {/* --- Avatar (não muda) --- */}
      {!isOwner && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.author.imageUrl} />
        </Avatar>
      )}

      <div className="relative">
        {/* --- Balão da Mensagem (estilos não mudam) --- */}
        <div
          className={cn(
            "flex flex-col max-w-xs sm:max-w-md text-sm rounded-lg p-3",
            isOwner
              ? "bg-blue-600/30 rounded-br-none"
              : "bg-gray-700/30 rounded-bl-none"
          )}
        >
          {/* --- Mensagem Respondida (RenderParentMessage deve aceitar FullMessage['parent']) --- */}
          {message.parent && (
            <RenderParentMessage
              message={message.parent as any}
              customEmojis={customEmojis}
            />
          )}{" "}
          {/* Use 'as any' ou ajuste o tipo de RenderParentMessage */}
          {/* --- Nome do Autor (não muda) --- */}
          <span
            className={cn(
              "font-semibold mb-1 text-white",
              !isOwner && "text-[#f5b719]"
            )}
          >
            {message.author.name.split(" ")[0] + (isOwner ? " (Você)" : "")}
          </span>
          {/* --- Conteúdo da Mensagem (Renderização não muda) --- */}
          {decryptedContent === null ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando...</span>
            </div>
          ) : isEditing ? (
            /* --- Área de Edição (não muda) --- */
            <div className="flex flex-col gap-2 mt-2 w-full">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="bg-black/30 text-white"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => editMessageMutation(editedContent)}
                  disabled={isEditingMessage}
                >
                  {" "}
                  {isEditingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Salvar"
                  )}{" "}
                </Button>
              </div>
            </div>
          ) : (
            decryptedContent && (
              <RenderMessageContent
                content={decryptedContent}
                customEmojis={customEmojis}
              />
            )
          )}
          {/* --- Indicador Editado (não muda) --- */}
          {message.isEdited && !isEditing && (
            <span className="text-xs text-gray-500 italic mt-1">(editado)</span>
          )}
          {/* --- Anexos (RenderAttachment deve funcionar com FileAttachment genérico) --- */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {message.attachments.map((attachment) => (
                <RenderAttachment key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}
        </div>

        {/* --- Reações Existentes (lógica não muda, as props da Badge/Tooltip são as mesmas) --- */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="absolute -bottom-4 left-2 flex flex-wrap gap-1.5 z-10">
            {/* ... Mapeamento e renderização das reações ... */}
            {Object.values(
              message.reactions.reduce((acc, r) => {
                const key = r.customEmojiId || r.emoji!;
                if (!acc[key]) acc[key] = { ...r, count: 0, reactors: [] }; // Inicializa reactors
                acc[key].count += 1;
                // Adiciona info mínima do usuário que reagiu
                if (r.user) {
                  acc[key].reactors.push({ id: r.user.id, name: r.user.name });
                }
                return acc;
              }, {} as Record<string, any>) // Ajustar tipo se necessário
            ).map((reactionData: any) => {
              // Verifica se o usuário atual reagiu COM ESTA reação específica
              const currentUserHasReacted = reactionData.reactors.some(
                (r: any) => r.id === user?.id
              );
              return (
                <TooltipProvider
                  key={reactionData.emoji || reactionData.customEmojiId}
                  delayDuration={100}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        onClick={() =>
                          toggleReactionMutation({
                            emoji: reactionData.emoji,
                            customEmojiId: reactionData.customEmojiId,
                          })
                        }
                        className={cn(
                          "bg-gray-700/60 text-white backdrop-blur-sm cursor-pointer hover:bg-gray-600/60 border border-transparent flex items-center gap-1",
                          currentUserHasReacted &&
                            "bg-blue-600/80 border-blue-400"
                        )}
                      >
                        {reactionData.customEmoji ? (
                          <CustomEmojiImage
                            emoji={reactionData.customEmoji}
                            onEmojiSelect={() => {
                              toggleReactionMutation({
                                customEmojiId: reactionData.customEmojiId,
                              });
                            }}
                            isReaction={true}
                          />
                        ) : (
                          <span>{reactionData.emoji}</span>
                        )}
                        {reactionData.count > 0 && (
                          <span className="text-xs font-bold">
                            {reactionData.count}
                          </span>
                        )}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#010d26] text-white border-gray-700 p-2 text-xs">
                      <p>
                        {reactionData.reactors
                          .map((r: any) => r.name || "Usuário")
                          .join(", ")}{" "}
                        reagiu com{" "}
                        {reactionData.customEmoji?.name || reactionData.emoji}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        )}

        {/* --- Menu de Ações Hover (não muda visualmente, só as actions chamadas) --- */}
        <div className="absolute top-0 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#010d26] rounded-full border border-gray-700 p-1 -translate-y-1/2">
          <ReactionPopover
            customEmojis={customEmojis}
            toggleReactionMutation={toggleReactionMutation}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onReply(message)}
          >
            <MessageCircleReply size={16} />
          </Button>
          {isOwner && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={16} />
            </Button>
          )}
          {isOwner && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => deleteMessageMutation()}
            >
              <Trash2 size={16} className="text-red-500" />
            </Button>
          )}
        </div>
      </div>

      {/* --- Avatar Owner (não muda) --- */}
      {isOwner && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.author.imageUrl} />
        </Avatar>
      )}
    </div>
  );
};
export default ChatMessage;
