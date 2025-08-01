"use client";
import { Conversation, Message } from "@prisma/client";
import ChatContent from "@/app/_components/Dashboard/ChatContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { verifyAccess } from "@/lib/utils";
import ChatSkeleton from "@/app/_components/Dashboard/ChatSkeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import ConversationNotFound from "@/app/_components/Dashboard/ConversationNotFound";
import axios from "axios";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
// CORREÇÃO: A função agora busca os dados da sua API local.
async function getConversation(
  conversationId: string
): Promise<(Conversation & { messages: Message[] }) | null> {
  try {
    const { data } = await axios.get(
      `${API_URL}/api/conversations/${conversationId}`
    );
    return data;
  } catch (error) {
    // Axios joga um erro em status 4xx/5xx, então o catch vai pegar o "Não Encontrado"
    console.error("Falha ao buscar conversa:", error);
    return null;
  }
}

const ConversationPage = () => {
  const params = useParams();

  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;

  const { user } = useAuth(); // A verificação de permissão seria feita aqui

  const {
    data: conversation,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation(conversationId!),
    retry: 1, // Tenta buscar apenas uma vez antes de falhar
  });

  const hasAccess = verifyAccess({
    pathname: `/chat/${conversationId}`,
    user: user!,
  });
  if (!hasAccess) return <DeniedAccess />;
  if (isLoading) {
    return (
      <div className="sm:p-8 p-4">
        <ChatSkeleton />
      </div>
    );
  }

  // Se a busca falhou (isError é true) ou não retornou dados, mostre a tela de "Não Encontrado".
  if (isError || !conversation) {
    return (
      <div className="sm:p-8 p-4">
        <ConversationNotFound />
      </div>
    );
  }

  // Se a busca foi bem-sucedida, mostre o conteúdo real.
  return (
    <div className="sm:p-8 p-4">
      <ChatContent initialConversation={conversation} />
    </div>
  );
};

export default ConversationPage;
