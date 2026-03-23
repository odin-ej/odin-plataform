import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bolt, Loader2, MessageSquarePlus } from "lucide-react";
import { FullUser } from "@/lib/server-utils";
import UserPhraseStatus from "../UserPhraseStatus";
import { useAuth } from "@/lib/auth/AuthProvider";

const UserProfileCard = ({
  user,
  setMemberViewOpen,
  createConversation,
  isPending,
}: {
  user: FullUser;
  setMemberViewOpen: (value: boolean) => void;
  createConversation: (userId: string) => void;
  isPending: boolean;
}) => {
  const authUser = useAuth().user;

  return (
    <div className="px-3 py-5 bg-[#010d26] rounded-lg space-y-3 text-center relative">
      <div
        className="absolute top-4 left-4 cursor-pointer"
        onClick={() => setMemberViewOpen(true)}
      >
        <Bolt className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="relative w-24 h-24 mx-auto">
        <UserPhraseStatus phraseStatus={user?.phraseStatus ?? "Olá"} />
        <Avatar className="w-24 h-24 border-4 border-[#00205e]">
          <AvatarImage src={user.imageUrl} />
          <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
        </Avatar>
        {/* Exemplo de badge de status, como na imagem */}
      </div>
      <div className="text-center">
        <h4 className="font-bold text-lg text-white">{user.name}</h4>
        <p className="text-sm text-gray-400">
          {user.currentRole?.name || "Ex-Membro"}
        </p>
      </div>

      {/* Interesses Profissionais */}
      <div className="text-left pt-2 border-t border-gray-700/50">
        <h5 className="text-xs font-bold uppercase text-gray-500 mb-2">
          Interesses Profissionais
        </h5>
        <div className="flex flex-wrap gap-1.5">
          {user.professionalInterests.length > 0 && (
            <>
              {user.professionalInterests.map((interest) => (
                <Badge
                  key={interest.id}
                  className="bg-[#0126fb] text-white hover:bg-[#0126fb]/90 truncate transition-colors text-[8px]"
                >
                  {interest.name}
                </Badge>
              ))}
            </>
          )}
        </div>
      </div>

      <Button
        onClick={authUser && authUser.id === user.id ? () => setMemberViewOpen(true) : () => createConversation(user.id)}
        className="w-full bg-[#36393f] hover:bg-[#4d5057] text-white"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : authUser && authUser.id === user.id ? (
          <>Ver Meu Perfil</>
        ) : (
          <>
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Iniciar Conversa
          </>
        )}
      </Button>
    </div>
  );
};

export default UserProfileCard;
