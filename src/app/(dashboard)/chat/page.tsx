import { redirect } from "next/navigation";
import { Conversation } from "@prisma/client";
import { cookies } from "next/headers";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Esta função chama a sua API para encontrar a conversa mais recente.
async function getLastConversation(): Promise<Conversation | null> {
  try {
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    // Passa os cookies do pedido atual para a chamada fetch, para que a API saiba quem está logado.
    const response = await fetch(`${baseUrl}/api/conversations/latest`, {
      next: { revalidate: 45 },
      headers,
    });
    if (response.status === 404) return null; // Nenhuma conversa encontrada
    if (!response.ok) throw new Error("Falha ao buscar a última conversa.");
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Esta função chama a sua API para criar uma nova conversa.
async function createNewConversation(): Promise<Conversation | null> {
  try {
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/conversations`, {
      method: "POST",
      headers,
    });
    if (!response.ok) throw new Error("Falha ao criar uma nova conversa.");
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

const ChatRedirectPage = async () => {
  // 1. Tenta encontrar a conversa mais recente
      const user = await getAuthenticatedUser();
    const hasPermission = verifyAccess({ pathname: "/chat", user: user! });
    if (!hasPermission) return <DeniedAccess />;
  const lastConversation = await getLastConversation();

  if (lastConversation) {
    // 2. Se encontrar, redireciona para ela
    redirect(`/chat/${lastConversation.id}`);
  } else {
    // 3. Se não houver nenhuma, CRIA a primeira e redireciona
    const newConversation = await createNewConversation();
    if (newConversation) {
      redirect(`/chat/${newConversation.id}`);
    } else {
      // Se a criação falhar, redireciona para o dashboard para evitar um loop
      redirect("/");
    }
  }
};

export default ChatRedirectPage;
