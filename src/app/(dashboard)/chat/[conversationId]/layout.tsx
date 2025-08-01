import { constructMetadata } from "@/lib/metadata";
import { ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const title = await fetch(`${API_URL}/api/conversations/${conversationId}`).then((res) => res.json()).then((data) => data.title);

  return constructMetadata({
    title: title ? `${title}` : "Chat IA",
    description: `Conversa com a IA sobre ${title || "tópicos diversos"}.`,
  });
}

export default function ChatLayout({ children }: { children: ReactNode }) {
  return children;
}
