import { getAuthenticatedUser } from "@/lib/server-utils";
import DirectConversationContent from "@/app/_components/Dashboard/comunidade/DirectConversationContent";
import { prisma } from "@/db";
import NotFound from "@/app/_components/Dashboard/comunidade/NotFound";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return null;

  const {id} = await params

  const conversation = await prisma.directConversation.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          currentRole: true,
        }
      },
      messages: {
        include: {
          author: {
            include: {
              roles: true,
              currentRole: true,
              posts: true,
            },
          },
          attachments: true,
          reactions: { include: { user: true } },
          replies: { include: { author: true } },

        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (
    !conversation ||
    !conversation.participants.some((p) => p.id === authUser.id)
  ) {
    return <NotFound />;
  }

  return (
    <DirectConversationContent
      initialConversation={conversation}
      currentUserId={authUser.id}
    />
  );
}
