import ChannelContent from "@/app/_components/Dashboard/comunidade/ChannelContent";
import NotFound from "@/app/_components/Dashboard/comunidade/NotFound";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { ChannelType } from "@prisma/client";

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


  if (user.isExMember && !channel.allowExMembers) {
    return <NotFound />;
  }

  // Regra 4: Lógica para Canal PRIVADO
  if (channel.type === ChannelType.PRIVATE) {
    const isMember = channel.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return <NotFound />; // Se for privado e não for membro (e não for Diretor), bloqueia
    }
  }
  // Lógica para Canal PÚBLICO
  else {
    // Regra 3: Se é público E restrito por áreas
    if (channel.restrictedToAreas && channel.restrictedToAreas.length > 0) {
      
      
      const hasMatchingArea = channel.restrictedToAreas.some((restrictedArea) =>
        user.currentRole?.area?.includes(restrictedArea)
      );
      if (!hasMatchingArea && (!user.isExMember && !channel.allowExMembers)) {
        return <NotFound />; // Se for restrito e não tiver a área, bloqueia
      }
    }
    // Regra 2: Se for público e NÃO restrito (restrictedToAreas.length === 0),
    // o acesso é permitido (pois já passou pelo filtro de ex-membro).
  }

  

  return <ChannelContent initialChannel={channel} currentUserId={user.id} />;
};

export default Page;
