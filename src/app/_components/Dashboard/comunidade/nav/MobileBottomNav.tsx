"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Users, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import ChannelsPanel from "./ChannelsPanel";
import MembersPanel from "./MembersPanel";
import { Button } from "@/components/ui/button";
import { FullUser } from "@/lib/server-utils";
import { DirectConversation } from "@prisma/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { FullChannel } from "../ChannelContent";

interface MobileBottomNavProps {
  channels: FullChannel[];
  conversations: (DirectConversation & { participants: FullUser[] })[];
  allUsers: FullUser[];
  exMembers: FullUser[];
}

const navLinks = [
  { name: "Feed", icon: LayoutDashboard, href: "/comunidade/feed" },
  { name: "Canais", icon: MessageSquare, panel: "channels" as const },
  { name: "Membros", icon: Users, panel: "members" as const },
];

const MobileBottomNav = ({
  channels,
  conversations,
  allUsers,
  exMembers,
}: MobileBottomNavProps) => {
  const pathname = usePathname();
  const [activePanel, setActivePanel] = useState<"channels" | "members" | null>(
    null
  );

  const {user} = useAuth()
  if(!user) return null;
  return (
    <>
      <ChannelsPanel
        isOpen={activePanel === "channels"}
        onClose={() => setActivePanel(null)}
        user={user as FullUser}
        channels={channels}
        conversations={conversations}
        allUsers={[...allUsers, ...exMembers]}
      />
      <MembersPanel
        isOpen={activePanel === "members"}
        onClose={() => setActivePanel(null)}
        allUsers={allUsers}
        exMembers={exMembers}
      />
      <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-[#010d26] border-t border-[#f5b719] lg:hidden">
        <div className="grid h-full max-w-lg grid-cols-3 mx-auto font-medium">
          {navLinks.map((item) => {
            // Se for um link de página normal
            if ("href" in item && item.href) {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link href={item.href} key={item.name} passHref>
                  <span className="inline-flex flex-col items-center justify-center px-5 hover:bg-[#f5b719]/10 w-full h-full">
                    <item.icon
                      className={cn(
                        "w-6 h-6 mb-1",
                        isActive ? "text-[#f5b719]" : "text-gray-400"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs",
                        isActive ? "text-[#f5b719]" : "text-gray-400"
                      )}
                    >
                      {item.name}
                    </span>
                  </span>
                </Link>
              );
            }
            if(!item.panel) return null
            // Se for um botão que abre um painel
            const isActive = activePanel === item.panel;
            return (
              <Button
                key={item.name}
                type="button"
                onClick={() => setActivePanel(isActive ? null : item.panel)}
                className={cn("inline-flex flex-col items-center justify-center px-5 hover:bg-[#f5b719]/10 w-full h-full bg-transparent", isActive ? 'bg-[#f5b719]/10' : '')}
              >
                <item.icon
                  className={cn(
                    "w-6 h-6 mb-1",
                    isActive ? "text-[#f5b719]" : "text-gray-400"
                  )}
                />
                <span
                  className={cn(
                    "text-xs",
                    isActive ? "text-[#f5b719]" : "text-gray-400"
                  )}
                >
                  {item.name}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MobileBottomNav;
