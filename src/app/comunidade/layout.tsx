import "../globals.css";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { prisma } from "@/db";
import CommunitySidebarLeft from "@/app/_components/Dashboard/comunidade/nav/CommunitySidebarLeft";
import CommunitySidebarRight from "@/app/_components/Dashboard/comunidade/nav/CommunitySidebarRight";
import MobileBottomNav from "@/app/_components/Dashboard/comunidade/nav/MobileBottomNav";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({ title: "Comunidade" });

async function getCommunityLayoutData() {
  const authUser = await getAuthenticatedUser();
  if (!authUser)
    return { users: [], exMembers: [], channels: [], conversations: [] };
  const users = await prisma.user.findMany({
    where: { isExMember: false, id: { not: process.env.ADMIN_ID } },
    include: {
      currentRole: true,
      professionalInterests: {
        include: {
          category: true,
        },
      },
      roleHistory: {
        include: {
          role: true,
          managementReport: true,
        },
      },
      favoritedPosts: true,
      reposts: true,
      roles: true,
      posts: true,
    },
    orderBy: { name: "asc" },
  });
  const exMembers = await prisma.user.findMany({
    where: { isExMember: true },
    include: {
      currentRole: true,
      professionalInterests: {
        include: {
          category: true,
        },
      },
      roleHistory: {
        include: {
          role: true,
          managementReport: true,
        },
      },
      favoritedPosts: true,
      reposts: true,
      roles: true,
      posts: true,
    },
    orderBy: { name: "asc" },
  });

  const channels = await prisma.channel.findMany({
    include: {
      members: {
        include: {
          user: {
            include: {
              currentRole: true,
              professionalInterests: {
                include: {
                  category: true,
                },
              },
              roleHistory: {
                include: {
                  role: true,
                  managementReport: true,
                },
              },
              favoritedPosts: true,
              reposts: true,
              roles: true,
              posts: true,
            },
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
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const conversations = await prisma.directConversation.findMany({
    where: {
      participants: {
        some: {
          id: authUser.id,
        },
      },
    },
    include: {
      participants: {
        include: {
          currentRole: true,
          roles: true,
          roleHistory: {
            include: {
              role: true,
              managementReport: true,
            },
          },
          favoritedPosts: true,
          reposts: true,
          posts: true,
          professionalInterests: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });
  return { users, exMembers, channels, conversations };
}

export default async function CommunityLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authUser = await getAuthenticatedUser();
  const { users, exMembers, channels, conversations } =
    await getCommunityLayoutData();

  if (!authUser) return null;

  return (
    <div className="h-screen w-full bg-[#010d26] text-white flex flex-col md:flex-row overflow-hidden">
      {/* --- VISÃO DESKTOP (3 COLUNAS) --- */}
      <div className="hidden lg:flex h-full w-full">
        <CommunitySidebarLeft
          channels={channels}
          allUsers={[...users, ...exMembers]}
          conversations={conversations}
        />
        <main className="flex-1 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {children}
        </main>
        <CommunitySidebarRight allUsers={users} exMembers={exMembers} />
      </div>

      {/* --- VISÃO MOBILE (CONTEÚDO + BARRA INFERIOR) --- */}
      <div className="lg:hidden flex flex-col h-full w-full">
        <main className="flex-1 overflow-y-auto pb-16">{children}</main>
        <MobileBottomNav
          channels={channels}
          conversations={conversations}
          allUsers={users}
          exMembers={exMembers}
        />
      </div>
    </div>
  );
}
