import ChannelContent from "@/app/_components/Dashboard/comunidade/ChannelContent";
import NotFound from "@/app/_components/Dashboard/comunidade/NotFound";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";

export const dynamic = "force-dynamic";


const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
   
  const { id } = await params;

  const user = await getAuthenticatedUser();

  if (!user) return null;

  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            include: {
              currentRole: true
            }
          },
        },
      },
      messages: {
        include: {
          author: true,
          attachments: true,
          parent: true,
          reactions: { include: { user: true } },
          replies: { include: { author: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!channel) return <NotFound />;

  if (channel.restrictedToAreas && channel.restrictedToAreas.length === 0) return <NotFound />;

  if (!channel.restrictedToAreas && !channel.members.some((m) => m.id === user.id))
    return <NotFound />;

  if(user.isExMember && !channel.allowExMembers) return <NotFound />

  

  return <ChannelContent initialChannel={channel} currentUserId={user.id} />;
};

export default Page;
