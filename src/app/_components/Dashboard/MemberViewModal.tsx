import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import { getInitials } from "@/lib/utils";
import { LinkIcon } from "lucide-react";

interface MemberViewModalProps {
  user: MemberWithFullRoles | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MemberViewModal = ({
  user,
  open,
  onOpenChange,
}: MemberViewModalProps) => {
  if (!user) {
    return null;
  }

  const formatOtherRole = (otherRole: string) => {
    return otherRole.charAt(0).toUpperCase() + otherRole.slice(1);
  };

  const userNameParts = user.name.split(" ");
  const formatedName =
    userNameParts.length > 1
      ? `${userNameParts[0]} ${userNameParts[userNameParts.length - 1]}`
      : user.name;
  const userImage = user.imageUrl || "";

  const formatedInstagram =
    user.instagram && user.instagram !== "N/A"
      ? user.instagram.startsWith("http")
        ? user.instagram
        : user.instagram.includes("@")
          ? `https://instagram.com/${user.instagram.split("@")[1]}`
          : `https://instagram.com/${user.instagram}`
      : "";

  const formatedlinkedin =
    user.linkedin && user.linkedin !== "N/A"
      ? user.linkedin.startsWith("http") 
        ? user.linkedin.startsWith('www') ? `https://${user.linkedin}` : user.linkedin
        : `https://linkedin.com/in/${user.linkedin}`
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <DialogTitle className="sr-only">
          Visualizar Membro: {user.name}
        </DialogTitle>
        <DialogContent className="bg-[#010d26] text-white rounded-2xl border-2 border-[#0126fb] p-0 max-w-md w-full max-h-[70vh] overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {/* Cabeçalho com informações principais */}
          <div className="relative pt-12 pb-8 px-8 flex flex-col items-center justify-center text-center">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#0126fb]/30 to-transparent rounded-t-xl" />
            <Avatar className="h-28 w-28 rounded-full border-4 border-[#010d26] object-cover z-10 -mt-2">
              <AvatarImage
                className="object-cover"
                src={userImage}
                alt={`Foto de ${user.name}`}
              />
              <AvatarFallback className="text-3xl font-bold bg-[#00205e]">
                {getInitials(formatedName)}
              </AvatarFallback>
            </Avatar>

            <h2 className="mt-4 text-2xl text-white font-bold">
              {formatedName}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              {user.isExMember && (
                <p className="rounded-full bg-[#f5b719]/10 px-3 py-1 text-xs font-semibold text-[#f5b719]">
                  Ex-Membro
                </p>
              )}
              {user.currentRole && !user.isExMember && (
                <p className="rounded-full bg-[#0126fb]/20 px-3 py-1 text-xs font-semibold text-white/90">
                  {user.currentRole.name}
                </p>
              )}
              {user.alumniDreamer && (
                <p className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
                  Alumni Dreamer
                </p>
              )}
            </div>
          </div>

          {/* Conteúdo com scroll */}
          <div className="bg-[#00205e]/20 px-8 pb-8 pt-6 space-y-4">
            <div className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
              <span className="text-zinc-400 font-medium col-span-1">
                Email pessoal
              </span>
              <span className="col-span-2 break-words">
                {user.email || "-"}
              </span>

              <span className="text-zinc-400 font-medium col-span-1">
                Email EJ
              </span>
              <span className="col-span-2 break-words">
                {user.emailEJ || "-"}
              </span>

              <span className="text-zinc-400 font-medium col-span-1">
                Telefone
              </span>
              <span className="col-span-2">{user.phone || "-"}</span>

              <span className="text-zinc-400 font-medium col-span-1">
                Curso
              </span>
              <span className="col-span-2">{user.course || "-"}</span>

              <span className="text-zinc-400 font-medium col-span-1">
                Semestre de Entrada
              </span>
              <span className="col-span-2">{user.semesterEntryEj || "-"}</span>

              {user.isExMember && (
                <>
                <span className="text-zinc-400 font-medium col-span-1">
                    Semestre da Saída
                  </span>
                  <span className="col-span-2">{user.semesterLeaveEj || "-"}</span>
                  <span className="text-zinc-400 font-medium col-span-1">
                    Local de Trabalho
                  </span>
                  <span className="col-span-2">{user.workplace || "-"}</span>
                </>
              )}

              <span className="text-zinc-400 font-medium col-span-1">
                Instagram
              </span>
              <div className="col-span-2">
                {user.instagram && user.instagram !== "N/A" ? (
                  <a
                    className="flex items-center gap-1.5 text-[#f5b719] hover:underline"
                    href={formatedInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LinkIcon className="w-4 h-4" /> Acessar Perfil
                  </a>
                ) : (
                  <span>-</span>
                )}
              </div>

              <span className="text-zinc-400 font-medium col-span-1">
                LinkedIn
              </span>
              <div className="col-span-2">
                {user.linkedin && user.linkedin !== "N/A" ? (
                  <a
                    className="flex items-center gap-1.5 text-[#f5b719] hover:underline"
                    href={formatedlinkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LinkIcon className="w-4 h-4" /> Acessar Perfil
                  </a>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
            <div className="border-t border-white/10 pt-4 space-y-3">
              <h4 className="text-base font-semibold text-zinc-300">Sobre</h4>
              <p className="text-sm text-zinc-400 leading-relaxed break-words">
                {user.about || "Nenhuma informação sobre."}
              </p>
            </div>

            {user.isExMember && (
              <>
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <h4 className="text-base font-semibold text-zinc-300">
                    Experiência na EJ
                  </h4>
                  <p className="text-sm text-zinc-400 leading-relaxed break-words">
                    {user.aboutEj ||
                      "Nenhuma informação sobre a experiência na EJ."}
                  </p>
                </div>
              </>
            )}

            <div className="border-t border-white/10 pt-4">
              <h4 className="text-base font-semibold text-zinc-300 mb-2">
                Cargos na EJ
              </h4>
              <div className="flex flex-wrap gap-2">
                {user.roles
                  .filter((role) => role.name !== "Outro")
                  .map((role) => (
                    <span
                      key={role.id}
                      className="bg-white/10 text-white/80 text-xs font-medium px-2.5 py-1 rounded-full"
                    >
                      {role.name}
                    </span>
                  ))}
                {user.otherRole && (
                  <span className="bg-[#0126fb]/10 text-[#0126fb]/80 text-xs font-medium px-2.5 py-1 rounded-full">
                    {formatOtherRole(user.otherRole)}
                  </span>
                )}
                {user.roles.length === 0 && (
                  <span className="text-sm text-zinc-400">
                    Nenhum cargo registrado.
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default MemberViewModal;
