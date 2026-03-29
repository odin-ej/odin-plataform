import { redirect } from "next/navigation";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { verifyAccess } from "@/lib/utils";
import { prisma } from "@/db";

export const dynamic = "force-dynamic";

const ChatRedirectPage = async () => {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const hasPermission = verifyAccess({ pathname: "/chat", user: user! });
  if (!hasPermission) return <DeniedAccess />;

  // Find latest active conversation
  const latest = await prisma.krakenConversation.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (latest) {
    redirect(`/chat/${latest.id}`);
  }

  // Create new conversation
  const newConv = await prisma.krakenConversation.create({
    data: {
      userId: user.id,
      title: "Nova conversa",
    },
  });

  redirect(`/chat/${newConv.id}`);
};

export default ChatRedirectPage;
