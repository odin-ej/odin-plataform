import { Conversation, Message } from ".prisma/client";
import ChatContent from "@/app/_components/Dashboard/ChatContent";
import { constructMetadata } from "@/lib/metadata";
import { cookies } from "next/headers";

export const metadata = constructMetadata({ title: "Chat IA" });

export const dynamic = "force-dynamic";
// CORREÇÃO: A função agora busca os dados da sua API local.
async function getConversation(
  conversationId: string
): Promise<(Conversation & { messages: Message[] }) | null> {
  try {
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/conversations/${conversationId}`,
      {
        next: { revalidate: 45 },
        headers,
      }
    );
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("Falha ao buscar conversa:", error);
    return null;
  }
}

const ConversationPage = async ({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) => {
  const { conversationId } = await params;
  const conversation = await getConversation(conversationId);

  // Se a conversa não for encontrada, pode mostrar uma mensagem ou redirecionar.
  if (!conversation) {
    return <div className="p-8 text-white">Conversa não encontrada.</div>;
  }

  return (
    <div className="sm:p-8 p-4">
      <ChatContent initialConversation={conversation} />
    </div>
  );
};

export default ConversationPage;
