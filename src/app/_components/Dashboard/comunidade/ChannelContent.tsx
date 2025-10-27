"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Prisma } from "@prisma/client";
import { Hash, Settings } from "lucide-react";
import MessageInput, { FullMessage } from "./MessageInput";
import ChatMessage from "./ChatMessage";
import { useEffect, useMemo, useRef, useState } from "react";
import { getChannelById, getCommunityFileSignedUrl, getCustomEmojis } from "@/lib/actions/community";
import { useQuery } from "@tanstack/react-query";
import ChannelDetailsModal from "./ChannelDetailsModal";

export type FullChannel = Prisma.ChannelGetPayload<{
  include: {
    members: {
      include: {
        user: {
          include: {
            currentRole: true;
          }
        };
      };
    };
    messages: {
      include: {
        author: true;
        attachments: true;
        parent: true;
        reactions: { include: { user: true } };
        replies: { include: { author: true } };
      };
      orderBy: { createdAt: "asc" };
    };
    restrictedToAreas: true,
  };
}>;

interface ChannelContentProps {
  initialChannel: FullChannel;
  currentUserId: string;
}

const ChannelContent = ({
  initialChannel,
  currentUserId,
}: ChannelContentProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<FullMessage | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const { data: channel } = useQuery({
    queryKey: ["channel", initialChannel.id],
    queryFn: async (): Promise<FullChannel | null> => {
      const data = await getChannelById(initialChannel.id);
      return data;
    },
    initialData: initialChannel,
    refetchInterval: 3000, // <-- A MÁGICA ACONTECE AQUI: busca novos dados a cada 3 segundos
    refetchOnWindowFocus: true, // Busca novos dados quando o usuário volta para a aba
  });
  const messages = useMemo(() => channel?.messages ?? [], [channel]);
  // const members = useMemo(
  //   () => channel?.members ?? [],
  //   [channel]
  // );

  const { data: customEmojis } = useQuery({
    queryKey: ["customEmojis"],
    queryFn: async () => await getCustomEmojis(),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if(!channel || !channel?.imageUrl || !channel.isPinned) return;
      const signedUrlImage = await getCommunityFileSignedUrl(channel.imageUrl)
      setSignedUrl(signedUrlImage)
    }
    fetchSignedUrl()
  }, [channel])

  if (!channel) {
    return <div>Conversa não encontrada ou acesso negado.</div>;
  }
  const title = channel.name;

  return (
    <>
      <div className="flex flex-col h-full bg-[#0c1a4b]/50">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!signedUrl ? (
              <Hash className="h-8 w-8 text-white" />
            ) : (
              <Avatar className="h-8 w-8">
                <AvatarImage src={signedUrl as string} />
                <AvatarFallback>{title.substring(0, 2)}</AvatarFallback>
              </Avatar>
            )}
            <h2 className="text-xl font-bold">{channel.name}</h2>
          </div>

          <Settings
            className="h-8 w-8 text-white cursor-pointer hover:text-[#f5b719]"
            onClick={() => setIsDetailsModalOpen(true)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <ChatMessage
              customEmojis={customEmojis ?? []}
              contextId={channel.id}
          contextType={'channel' as const}
              key={message.id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              message={message as any}
              isOwner={message.authorId === currentUserId}
              onReply={() => setReplyTo(message as unknown as FullMessage)}
            />
          ))}
          <div ref={messagesEndRef} /> {/* Âncora para o scroll automático */}
        </div>

        <MessageInput
          contextId={channel.id}
          contextType={'channel' as const}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
      <ChannelDetailsModal
        isOpen={isDetailsModalOpen}
        currentUserId={currentUserId}
        onClose={() => setIsDetailsModalOpen(false)}
        channel={channel}
      />
    </>
  );
};

export default ChannelContent;
