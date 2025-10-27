'use client'
import UserProfileCard from "./UserProfileCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Home } from "lucide-react";
import { useMemo, useState } from "react";
import { FullUser } from "@/lib/server-utils";

interface ContentSidebarRightProps{
   allUsers: FullUser[];
   exMembers: FullUser[];
   setSelectedUser: (user: FullUser) => void;
   setMemberViewOpen: (value: boolean) => void;
}

const ContentSidebarRight = ({setSelectedUser, allUsers, exMembers, setMemberViewOpen}: ContentSidebarRightProps) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const usersByRole = useMemo(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    const filterUser = (user: FullUser) =>
      user.name.toLowerCase().includes(lowercasedSearch);

    
    const directors = allUsers.filter(
      (u) => u.currentRole?.area.includes("DIRETORIA") && filterUser(u)
    );
    const taticos = allUsers.filter(
      (u) => u.currentRole?.area.includes("TATICO") && filterUser(u)
    );
    const consultores = allUsers.filter(
      (u) => u.currentRole?.area.includes("CONSULTORIA") && filterUser(u)
    );
    const filteredExMembers = exMembers.filter(filterUser);

    return { directors, taticos, consultores, exMembers: filteredExMembers };
  }, [allUsers, exMembers, searchTerm]);

  const { mutate: createConversation, isPending: isCreatingConversation } =
    useMutation({
      mutationFn: async (userId: string) => {
        const response = await axios.post("/api/community/conversations", userId);
        return response.data;
      },
      onSuccess: (data) => {
        // Redirecionar para a conversa criada
        router.push("/comunidade/conversas/" + data.id);
      },
      onError: (error) => {
        console.error("Erro ao criar conversa:", error);
        toast.error("Erro ao criar conversa. Tente novamente.");
      },
    });
  const roleSections = [
    { title: "Diretoria", users: usersByRole.directors, value: "diretoria" },
    { title: "Táticos", users: usersByRole.taticos, value: "taticos" },
    {
      title: "Consultores",
      users: usersByRole.consultores,
      value: "consultoria",
    },
    { title: "Ex-Membros", users: usersByRole.exMembers, value: "ex-membros" },
  ];
  return (
    <div className="flex flex-col h-full scrollbar-thin scrollbar-thumb-gray-700/50  overflow-y-auto">
      <h2 className="font-bold text-lg text-white mb-2 text-center flex items-center justify-center gap-2">
        <Home className="h-4 w-4" /> Sócios da Casinha
      </h2>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Buscar..."
          className="bg-black/30 border-gray-700 pl-9 text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 pr-2">
        <Accordion
          type="multiple"
          defaultValue={["diretoria"]}
          className="w-full space-y-2"
        >
          {roleSections.map(
            (section) =>
              section.users.length > 0 && (
                <AccordionItem
                  key={section.value}
                  value={section.value}
                  className="border-none"
                >
                  <AccordionTrigger className="text-xs font-bold uppercase text-gray-500 hover:no-underline p-2">
                    {section.title} — {section.users.length}
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    {/* --- ACORDEÃO ANINHADO PARA OS USUÁRIOS --- */}
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full space-y-1"
                    >
                      {section.users.map((user) => (
                        <AccordionItem
                          key={user.id}
                          value={user.id}
                          className="border-none"
                        >
                          <AccordionTrigger
                            className="p-2 rounded-md hover:bg-white/5 hover:no-underline [&[data-state=open]]:bg-[#0126fb]/50"
                            onClick={() => setSelectedUser(user)}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.imageUrl} />
                                <AvatarFallback>
                                  {user.name.substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-gray-300">
                                {user.name}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-1">
                            <UserProfileCard
                              user={user}
                              setMemberViewOpen={setMemberViewOpen}
                              createConversation={createConversation}
                              isPending={isCreatingConversation}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              )
          )}
        </Accordion>
      </div>
    </div>
  );
};

export default ContentSidebarRight;
