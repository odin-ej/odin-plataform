"use client";
import React, { useEffect, useRef, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Users } from "lucide-react";
import ChatMessage from "./ChatMessage";
import MessageInput, { FullMessage } from "./MessageInput";
import { useQuery } from "@tanstack/react-query";
import { Prisma } from "@prisma/client";
import ConversationDetailsModal from "./ConversationDetailsModal";
import { getConversationById, getCustomEmojis } from "@/lib/actions/community";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FullDirectConversation = Prisma.DirectConversationGetPayload<{
  include: {
    participants: {
      include: {
        currentRole: true;
      };
    };
    messages: {
      include: {
        author: {
          include: {
            roles: true;
            currentRole: true;
            posts: true;
          };
        };
        attachments: true;
        reactions: true;
      };
    };
  };
}>;

interface DirectConversationContentProps {
  initialConversation: FullDirectConversation;
  currentUserId: string;
}

const DirectConversationContent = ({
  initialConversation,
  currentUserId,
}: DirectConversationContentProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<FullMessage | null>(null);
  const { data: conversation } = useQuery({
    queryKey: ["conversation", initialConversation.id],
    queryFn: async (): Promise<FullDirectConversation | null> => {
      const data = await getConversationById(initialConversation.id);
      return data;
    },
    initialData: initialConversation,
    refetchInterval: 3000, // <-- A MÁGICA ACONTECE AQUI: busca novos dados a cada 3 segundos
    refetchOnWindowFocus: true, // Busca novos dados quando o usuário volta para a aba
  });
  const messages = useMemo(() => conversation?.messages ?? [], [conversation]);
  const participants = useMemo(
    () => conversation?.participants ?? [],
    [conversation]
  );

  const { data: customEmojis } = useQuery({
    queryKey: ["customEmojis"],
    queryFn: async () => await getCustomEmojis(),
  });

  const title = conversation?.title;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  if (!conversation) {
    return <div>Conversa não encontrada ou acesso negado.</div>;
  }

  const isGroupChat = participants.length > 2;
  const otherParticipant = participants.find((p) => p.id !== currentUserId);

  return (
    <>
      <div className="flex flex-col h-full bg-[#0c1a4b]/50">
        <div className="p-4 border-b border-gray-700 flex bg-[#010d26] items-center justify-between">
          <div className="flex items-center gap-3 ">
            {isGroupChat ? (
              <Users className="h-8 w-8 text-white" />
            ) : (
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={otherParticipant ? otherParticipant.imageUrl : undefined}
                />
                <AvatarFallback>
                  {otherParticipant?.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
            )}
            <h2 className="text-xl font-bold">
              {title ||
                (isGroupChat ? (
                  "Grupo sem Título"
                ) : (
                  <span>
                    {otherParticipant?.name}{" "}
                    <Badge className="bg-[#f5b719]/10 text-[#f5b719] ml-2 text-xs">
                      {!otherParticipant?.isExMember
                        ? otherParticipant?.currentRole?.name
                        : "Ex-Membro"}
                    </Badge>{" "}
                    {otherParticipant?.alumniDreamer && (
                      <Badge className="text-xs bg-purple-500/10 text-purple-400">
                        Alumni Dreamer
                      </Badge>
                    )}
                  </span>
                ))}
            </h2>
          </div>
          {isGroupChat && (
            <Settings
              className="h-8 w-8 text-white cursor-pointer hover:text-[#f5b719]"
              onClick={() => setIsDetailsModalOpen(true)}
            />
          )}
        </div>

        <div className={cn("flex-1 overflow-y-auto p-4 space-y-4 relative")}>
          <div className="absolute inset-0 z-0 bg-[url('/logo-amarela.png')] bg-center bg-no-repeat bg-[length:300px_auto] opacity-5 pointer-events-none"></div>{" "}
          {/* Ajuste bg-size e opacity */}
          {messages.map((message) => (
            <ChatMessage
              customEmojis={customEmojis ?? []}
              key={message.id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              message={message as any}
              contextId={conversation.id}
              contextType={"direct" as const}
              isOwner={message.authorId === currentUserId}
              onReply={() => setReplyTo(message as unknown as FullMessage)}
            />
          ))}
          <div ref={messagesEndRef} /> {/* Âncora para o scroll automático */}
        </div>

        <MessageInput
          replyTo={replyTo}
          contextId={conversation.id}
          contextType={"direct" as const}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
      <ConversationDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        conversation={conversation}
      />
    </>
  );
};
export default DirectConversationContent;
