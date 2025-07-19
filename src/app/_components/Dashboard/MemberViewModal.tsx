import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import { getInitials } from "@/lib/utils";
import { DialogTitle } from "@radix-ui/react-dialog";
interface MemberViewModalProps {
  user: MemberWithFullRoles;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MemberViewModal = ({
  user,
  open,
  onOpenChange,
}: MemberViewModalProps) => {
  const userName = user?.name.split(" ") || "Utilizador";
  const formatedName = userName[0].concat(" ", userName[userName.length - 1]);
  const userImage = user?.imageUrl || "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
     <DialogPortal>
       <DialogTitle className="sr-only"></DialogTitle>
      <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
      <DialogContent className="bg-[#010d26] text-white rounded-xl mx-auto !border-[##0126fb]">
        <DialogHeader className="flex flex-col gap-2 items-center justify-center">
          <Avatar className="mt-8 h-28 w-28 rounded-full border-2 border-white object-cover mx-auto">
            <AvatarImage
              className="object-cover"
              src={userImage}
              alt={`Foto de ${userName}`}
            />
            <AvatarFallback className="text-2xl font-bold">
              {getInitials(formatedName)}
            </AvatarFallback>
          </Avatar>

          <h2 className="mt-4 text-2xl text-white font-semibold">
            {formatedName}
          </h2>
          <div className="flex flex-wrap items-center justify-centerg gap-3">
            {user!.isExMember && (
              <p className="mt-2 max-w-fit rounded-full bg-[#f5b719]/10 px-2 py-1 text-xs font-semibold text-[#f5b719]">
                Ex-Membro
              </p>
            )}

            {user.currentRole && !user.isExMember && (
              <p className="mt-2 max-w-fit rounded-full bg-[#0126fb]/10 px-2 py-1 text-xs font-semibold text-white">
                {user.currentRole.name}
              </p>
            )}

            {user!.alumniDreamer && (
              <p className="mt-2 max-w-fit rounded-full bg-purple-600/10 px-2 py-1 text-xs font-semibold text-purple-500">
                Alumni Dreamer
              </p>
            )}
          </div>
        </DialogHeader>
        <div className="mt-6 space-y-3 px-4 text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-zinc-400">Email pessoal</span>
            <span>{user.email || "-"}</span>

            <span className="text-zinc-400">Email EJ</span>
            <span>{user.emailEJ || "-"}</span>

            <span className="text-zinc-400">Telefone</span>
            <span>{user.phone || "-"}</span>

            <span className="text-zinc-400">Curso</span>
            <span>{user.course || "-"}</span>

            <span className="text-zinc-400">Instagram</span>
            <span>{user.instagram || "-"}</span>

            <span className="text-zinc-400">LinkedIn</span>
            <span>{user.linkedin || "-"}</span>

            <span className="text-zinc-400">Entrada na EJ</span>
            <span>{user.semesterEntryEj || "-"}</span>

            <span className="text-zinc-400">Saída da EJ</span>
            <span>{user.semesterLeaveEj || "-"}</span>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-semibold text-zinc-400 mb-1">
              Cargos na EJ
            </h4>
            <ul className="list-disc pl-5 text-sm">
              {user.roles.map((role) => (
                <li key={role.id}>{role.name}</li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
     </DialogPortal>
    </Dialog>
  );
};

export default MemberViewModal;
