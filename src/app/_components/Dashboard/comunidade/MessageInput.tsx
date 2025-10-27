/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusCircle,
  SendHorizontal,
  X,
  File as FileIcon,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import React, { useState, useRef, useEffect } from "react";
import ImageCropModal from "../../Global/ImageCropModal";
import EmojiComponent from "./EmojiComponent";
import {
  createCustomEmoji,
  decryptMessage,
  getCustomEmojis,
  sendMessage,
} from "@/lib/actions/community";
import { Prisma } from "@prisma/client";

const messageSchema = z.object({
  content: z.string().max(2000).optional(),
});
type MessageForm = z.infer<typeof messageSchema>;

// Exemplo: Coloque isso em MessageInput.tsx ou um arquivo de tipos compartilhado

type ContextType = "direct" | "channel";

// Define includes comuns para ambos os tipos de mensagem
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const messageIncludes = {
  author: true,
  reactions: {
    include: {
      user: true,
      customEmoji: true,
    },
  },
  attachments: true,
  parent: {
    // Inclui o pai para a funcionalidade de resposta
    include: {
      author: true,
    },
  },
  replies: false, // Geralmente não precisamos carregar todas as respostas aninhadas
};

// Tipo para DirectMessage com includes
export type FullDirectMessagePayload = Prisma.DirectMessageGetPayload<{
  include: typeof messageIncludes & { conversation: true }; // Adiciona a conversa
}>;

// Tipo para ChannelMessage com includes
export type FullChannelMessagePayload = Prisma.ChannelMessageGetPayload<{
  include: typeof messageIncludes & { channel: true }; // Adiciona o canal
}>;

// Tipo União - Representa qualquer um dos dois tipos de mensagem
export type FullMessage = FullDirectMessagePayload | FullChannelMessagePayload;

// Tipo auxiliar para saber qual é qual (opcional, mas útil)
export function isDirectMessage(
  message: FullMessage
): message is FullDirectMessagePayload {
  return (message as FullDirectMessagePayload).conversationId !== undefined;
}
export function isChannelMessage(
  message: FullMessage
): message is FullChannelMessagePayload {
  return (message as FullChannelMessagePayload).channelId !== undefined;
}

interface MessageInputProps {
  contextId: string; // <-- Renomeado
  contextType: ContextType; // <-- Adicionado
  replyTo: FullMessage | null;
  onCancelReply: () => void;
}

const MessageInput = ({
  contextId,
  contextType,
  replyTo,
  onCancelReply,
}: MessageInputProps) => {
  const queryClient = useQueryClient();
  const form = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: "" },
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [decryptedReplyContent, setDecryptedReplyContent] = useState<
    string | null
  >(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [emojiName, setEmojiName] = useState("");
  const [isEmojiModalOpen, setIsEmojiModalOpen] = useState(false);

  const { data: customEmojis, refetch: refetchEmojis } = useQuery({
    queryKey: ["customEmojis"],
    queryFn: async () => await getCustomEmojis(),
  });

  const { mutate: send, isPending } = useMutation({
    mutationFn: async (data: MessageForm) => {
      let uploadedAttachmentsData = [];
      if (attachments.length > 0) {
        const uploadFormData = new FormData();
        attachments.forEach((file) => uploadFormData.append("files", file));
        const response = await fetch("/api/community/upload-file", {
          method: "POST",
          body: uploadFormData,
        });
        if (!response.ok) throw new Error("Falha ao fazer upload dos anexos.");
        const result = await response.json();
        uploadedAttachmentsData = result.files;
      }

      const messageFormData = new FormData();
      messageFormData.append("content", data.content || "");
      // Removido: messageFormData.append("conversationId", contextId); // Não precisa mais, passado como arg
      if (replyTo) messageFormData.append("parentId", replyTo.id);
      messageFormData.append(
        "attachments",
        JSON.stringify(uploadedAttachmentsData)
      );

      // 👇 Passa contextType e contextId para a action 👇
      return await sendMessage(messageFormData, contextType, contextId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [contextType, contextId] });
      form.reset();
      setAttachments([]);
      onCancelReply();
    },
    onError: (err) => {
      toast.error("Falha ao enviar mensagem.", {
        description: (err as Error).message,
      });
    },
  });

  const { mutate: createEmoji } = useMutation({
    mutationFn: async ({ name, file }: { name: string; file: File }) =>
      await createCustomEmoji({ name, file }),
    onSuccess: () => {
      toast.success("Emoji customizado criado!");
      refetchEmojis();
    },
    onError: () => {
      toast.error("Falha ao criar emoji.");
    },
  });

  useEffect(() => {
    if (replyTo?.content) {
      setDecryptedReplyContent("Carregando..."); // Estado inicial
      decryptMessage(replyTo.content)
        .then(setDecryptedReplyContent)
        .catch(() => setDecryptedReplyContent("Erro ao carregar"));
    } else {
      setDecryptedReplyContent(null); // Limpa se não houver replyTo ou conteúdo
    }
  }, [replyTo?.content, replyTo]);

  const onEmojiSelect = (emoji: string) =>
    form.setValue("content", form.getValues("content") + emoji);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files)
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
  };
  const removeAttachment = (index: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!emojiName) {
      toast.error("O nome do emoji é obrigatório.");
      return;
    }
    const file = new File([croppedBlob], `${emojiName}.jpeg`, {
      type: "image/jpeg",
    });
    createEmoji({ name: emojiName, file });
  };

  return (
    <div className="p-4 bg-[#010d26] border-t border-gray-700/50">
      {replyTo && (
        <div className="bg-[#00205e]/50 p-2 rounded-t-md text-xs text-gray-300 border-b-2 border-[#f5b719] mb-1">
          <div className="flex justify-between items-center">
            <span>
              Respondendo a <strong>{replyTo.author.name}</strong>
            </span>
            <button onClick={onCancelReply}>
              <X size={16} />
            </button>
          </div>
          <p className="truncate italic mt-1">
            &quot;{decryptedReplyContent}&quot;
          </p>
        </div>
      )}
      {attachments.length > 0 && (
        <div className="flex pt-4 gap-2 mb-2 overflow-x-auto pb-2">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="relative p-2 bg-black/30 rounded-md flex items-center gap-2"
            >
              {file.type.startsWith("image/") ? (
                <ImageIcon className="h-5 w-5 text-blue-400" />
              ) : (
                <FileIcon className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-xs text-gray-300 truncate max-w-[100px]">
                {file.name}
              </span>
              <Button
                type="button"
                onClick={() => removeAttachment(i)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 z-50 hover:bg-red-400 transition-colors flex items-center justify-center shadow"
              >
                <X size={10} className="text-white" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
        >
          <PlusCircle size={24} />
        </Button>
        <form
          onSubmit={form.handleSubmit(send as any)}
          className="flex-1 flex gap-2 items-center"
        >
          <Input
            placeholder="No que você está pensando?"
            {...form.register("content")}
            className="bg-black/30 border-gray-700"
            disabled={isPending}
          />
          <EmojiComponent
            customEmojis={customEmojis ?? []}
            onEmojiSelect={onEmojiSelect}
            isEmojiModalOpen={isEmojiModalOpen}
            setIsEmojiModalOpen={setIsEmojiModalOpen}
            emojiName={emojiName}
            setEmojiName={setEmojiName}
            setImageToCrop={setImageToCrop}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-[#f5b719] text-black hover:bg-[#f5b719]/90"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <SendHorizontal size={20} />
            )}
          </Button>
        </form>
      </div>

      {imageToCrop && (
        <ImageCropModal
          imageSrc={imageToCrop}
          onClose={() => setImageToCrop(null)}
          onCropComplete={handleCropComplete}
          cropShape="round"
          aspect={1}
        />
      )}
    </div>
  );
};
export default MessageInput;
