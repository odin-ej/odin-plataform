import { constructMetadata } from "@/lib/metadata";
import { ReactNode } from "react";
import { prisma } from "@/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  let title = "Kraken";
  try {
    const conv = await prisma.krakenConversation.findUnique({
      where: { id: conversationId },
      select: { title: true },
    });
    if (conv?.title) title = conv.title;
  } catch {
    // Ignore — use default title
  }

  return constructMetadata({
    title,
    description: `Conversa com o Kraken sobre ${title}.`,
  });
}

export default function ChatLayout({ children }: { children: ReactNode }) {
  return children;
}
