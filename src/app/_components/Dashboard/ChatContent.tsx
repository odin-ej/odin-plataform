// ChatContent.tsx

"use client";

import React, { useEffect, useRef } from "react";
import { Conversation, Message } from ".prisma/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare, Paperclip, Clock } from "lucide-react";
import { checkUserPermission, cn, fileToBase64 } from "@/lib/utils";
import CustomTextArea from "../Global/Custom/CustomTextArea";
import { SubmitHandler, useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import Image from "next/image";
import ChatHistorySheet from "./ChatHistorySheet";
import { useAuth } from "@/lib/auth/AuthProvider";
import CustomCard from "../Global/Custom/CustomCard";
import { AreaRoles } from ".prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

type MessageWithImageUrl = Message & { imageUrl?: string };

export type ConversationType = Conversation & {
  messages: MessageWithImageUrl[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ChatContent = ({
  initialConversation,
}: {
  initialConversation: ConversationType;
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<{ prompt: string }>({ defaultValues: { prompt: "" } });

  const promptValue = form.watch("prompt");
  const queryClient = useQueryClient();
  const conversationId = initialConversation.id;

  // --- QUERY PARA GERENCIAR A CONVERSA ---
  const { data: conversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async (): Promise<ConversationType> => {
      const { data } = await axios.get(
        `${API_URL}/conversations/${conversationId}`
      );
      return data;
    },
    initialData: initialConversation,
  });

  // --- MUTAÇÃO PARA ENVIAR MENSAGEM (COM UPLOAD E OTIMISMO) ---
  const { mutate: sendMessage, isPending: isLoading } = useMutation({
    // A 'mutationFn' contém toda a lógica assíncrona
    mutationFn: async (variables: { prompt: string; file?: File }) => {
      const { prompt, file } = variables;
      let finalPrompt = prompt;
      let fileData: { mimeType: string; base64: string } | undefined;

      if (file) {
        // Se for uma imagem, converte para base64 para análise imediata
        if (file.type.startsWith("image/")) {
          fileData = await fileToBase64(file);
          finalPrompt = prompt || `Analise a imagem que enviei.`;
        }
        // Se for um PDF ou outro documento, faz o upload para o S3 para o RAG
        else if (file.type === "application/pdf") {
          const presignedUrlResponse = await fetch("/api/s3-chat-upload", {
            method: "POST",
            body: JSON.stringify({ fileType: file.type, fileSize: file.size }),
            headers: { "Content-Type": "application/json" },
          });

          if (!presignedUrlResponse.ok)
            throw new Error("Não foi possível preparar o upload do documento.");

          const { url } = await presignedUrlResponse.json();
          const uploadResponse = await fetch(url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });

          if (!uploadResponse.ok)
            throw new Error("Falha ao enviar o documento para o S3.");

          const formData = new FormData();
          formData.append("file", file);
          const knowledgeResponse = await fetch("/api/knowledge/upload", {
            method: "POST",
            body: formData,
          });
          const knowledgeResult = await knowledgeResponse.json();
          if (!knowledgeResponse.ok) throw new Error(knowledgeResult.message);

          // Informa o utilizador e a IA que o ficheiro foi adicionado
          finalPrompt = `Eu acabei de fazer o upload de um documento chamado "${file.name}". Por favor, faça um resumo detalhado desse documento.`;
        } else {
          throw new Error(
            "Tipo de ficheiro não suportado. Até 100MB de tamanho - PDF | JPG | JPEG | PNG"
          );
        }
      }

      // A chamada final para a API do chat
      const response = await axios.post(`${API_URL}/chat/${conversationId}`, {
        prompt: finalPrompt,
        fileData,
      });

      return response.data; // Retorna a resposta da IA
    },

    // ATUALIZAÇÃO OTIMISTA DA MENSAGEM DO USUÁRIO
    onMutate: async (variables: { prompt: string; file?: File }) => {
      await queryClient.cancelQueries({
        queryKey: ["conversation", conversationId],
      });
      const previousConversation = queryClient.getQueryData<ConversationType>([
        "conversation",
        conversationId,
      ]);

      const userMessage: MessageWithImageUrl = {
        id: `optimistic-${Date.now()}`,
        role: "user",
        content:
          variables.prompt +
          (variables.file ? `\n(Arquivo anexado: ${variables.file.name})` : ""),
        conversationId: conversationId,
        imageUrl:
          variables.file && variables.file.type.startsWith("image/")
            ? URL.createObjectURL(variables.file)
            : undefined,
        createdAt: new Date(),
      };

      queryClient.setQueryData<ConversationType>(
        ["conversation", conversationId],
        (oldData) => ({
          ...(oldData || initialConversation),
          messages: [...(oldData?.messages || []), userMessage],
        })
      );

      return { previousConversation };
    },

    // ADICIONA A RESPOSTA DA IA EM CASO DE SUCESSO
    onSuccess: (data) => {
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "model",
        content: data.response, // Supondo que a API retorne { response: '...' }
        conversationId: conversationId,
        createdAt: new Date(),
      };

      queryClient.setQueryData<ConversationType>(
        ["conversation", conversationId],
        (oldData) => ({
          ...oldData!,
          messages: [...oldData!.messages, aiMessage],
        })
      );
    },

    // REVERTE E MOSTRA O ERRO EM CASO DE FALHA
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any, variables, context) => {
      // Reverte para o estado anterior em caso de erro
      if (context?.previousConversation) {
        queryClient.setQueryData(
          ["conversation", conversationId],
          context.previousConversation
        );
      }

      const errorMessageContent =
        error.response?.data?.message ||
        error.message ||
        "Desculpe, ocorreu um erro.";
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "model",
        content: `Erro: ${errorMessageContent}`,
        conversationId: conversationId,
        createdAt: new Date(),
      };

      queryClient.setQueryData<ConversationType>(
        ["conversation", conversationId],
        (oldData) => ({
          ...oldData!,
          messages: [...oldData!.messages, errorMessage],
        })
      );
    },

    // LIMPEZA APÓS A CONCLUSÃO
    onSettled: () => {
      if (fileInputRef.current) fileInputRef.current.value = ""; // Limpa o input de arquivo
      // Podemos revalidar para garantir 100% de consistência com o DB, se necessário
      queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId],
      });
    },
  });

  // O NOVO HANDLER, MUITO MAIS SIMPLES
  const handleSendMessage: SubmitHandler<{ prompt: string }> = (data) => {
    const file = fileInputRef.current?.files?.[0];
    if ((!data.prompt.trim() && !file) || isLoading) return;

    sendMessage({ prompt: data.prompt, file });
    form.reset({ prompt: "" });
  };

  useEffect(() => {
    // O scroll agora depende dos dados da query
    scrollAreaRef.current?.scrollTo(0, scrollAreaRef.current.scrollHeight);
  }, [conversation?.messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      form.handleSubmit(handleSendMessage)();
    }
  };

  const { user } = useAuth();

  const isDirector = checkUserPermission(user, {
    allowedAreas: [AreaRoles.DIRETORIA],
  });
  const limitCount = isDirector ? 40 : 20;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row items-center justify-between mb-6">
        <CustomCard
          type="link"
          icon={Clock}
          className="hidden sm:block w-full"
          title="Limite de mensagens"
          value={limitCount}
        />
        <CustomCard
          type="link"
          icon={Clock}
          className=" w-full"
          title="Mensagens restantes"
          value={limitCount - user!.dailyMessageCount}
        />
      </div>
      <div className="rounded-lg flex h-full max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex-col bg-[#010d26] text-white">
        {/* Top action bar */}
        <div className="sticky rounded-lg top-0 z-10 w-full bg-[#010d26] border-b border-[#0126fb]/30 p-4 flex justify-end">
          <ChatHistorySheet activeConversationId={initialConversation.id}>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-[#0126fb]/20"
            >
              <MessageSquare className="text-white" />
            </Button>
          </ChatHistorySheet>
        </div>
        {/* Chat messages */}
        <div
          ref={scrollAreaRef}
          className="flex-1 min-h-[60vh] overflow-y-auto space-y-6 px-4 py-6"
        >
          {conversation?.messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-4",
                msg.role === "user" && "justify-end"
              )}
            >
              {msg.role === "model" && (
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-ful">
                  <Image
                    src="/logo-branca.png"
                    alt="Logo Branca"
                    width={40}
                    height={40}
                  />
                </div>
              )}

              <div
                className={cn(
                  "max-w-lg lg:max-w-2xl rounded-2xl p-4",
                  msg.role === "user" ? "bg-[#00205e]" : "bg-[#0B2A6B]"
                )}
              >
                {msg.imageUrl && (
                  <Image
                    src={msg.imageUrl}
                    alt="Anexo"
                    width={200}
                    height={200}
                    className="rounded-lg mb-2 max-w-xs"
                  />
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>

              {msg.role === "user" && (
                <Avatar className="flex-shrink-0">
                  <AvatarImage src={user?.imageUrl || ""} />
                  <AvatarFallback>{user?.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full">
                <Image
                  src="/logo-branca.png"
                  alt="Logo Branca"
                  width={40}
                  height={40}
                />
              </div>
              <div className="max-w-lg rounded-2xl p-4 bg-[#0B2A6B] flex items-center">
                <div className="h-2 w-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s] mx-1"></div>
                <div className="h-2 w-2 bg-white rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input section */}
        <div className="border-t border-gray-700 bg-[#00205e] p-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSendMessage)}
              className="flex items-start gap-2 max-w-4xl mx-auto"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={user!.dailyMessageCount === limitCount}
                className="hidden"
                accept="image/png, image/jpeg, application/pdf"
              />
              <Button
                type="button"
                variant="ghost"
                disabled={user!.dailyMessageCount === limitCount || isLoading}
                size="icon"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <CustomTextArea<{ prompt: string }>
                form={form}
                label=""
                field="prompt"
                disabled={user!.dailyMessageCount === limitCount}
                placeholder={
                  user!.dailyMessageCount === limitCount
                    ? "Opa... seu limite diário acabou!"
                    : "Digite a sua mensagem..."
                }
                className="flex-1 bg-[#010d26] border-gray-700 focus-visible:ring-1 focus-visible:ring-[#0126fb] resize-none"
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    form.handleSubmit(handleSendMessage)();
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="bg-[#0126fb] hover:bg-[#0126fb]/80"
                disabled={isLoading || !promptValue.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </>
  );
};

export default ChatContent;
