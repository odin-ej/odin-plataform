import { useEffect, useState } from "react";
import { Tag as UserTag } from ".prisma/client";
import { UserRankingInfo } from "@/lib/schemas/pointsSchema";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

interface UserTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserRankingInfo | null;
}

const UserTagsModal = ({ isOpen, onClose, user }: UserTagsModalProps) => {
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && user) {
      setIsLoading(true);
      fetch(`/api/users/${user.id}/tags`)
        .then((res) => res.json())
        .then((data) => setUserTags(data))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .catch((err) => toast.error("Erro ao buscar tags do utilizador."))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, user]);

  const handleDeleteTag = async (tagId: string) => {
    if (
      confirm(
        "Tem a certeza que quer desvincular esta tag do histórico do utilizador?"
      )
    ) {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPointsId: null }), // Envia o corpo para desvincular
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao desvincular a tag.");
      }
      toast.success("Tag desvinculada com sucesso!");
      // Refrescar os dados
      const updatedTags = userTags.filter((t) => t.id !== tagId);
      setUserTags(updatedTags);
      router.refresh(); // Atualiza a tabela principal também
    }
  };

  const userTagsColumns: ColumnDef<UserTag>[] = [
    { accessorKey: "description", header: "Descrição" },
    {
      accessorKey: "datePerformed",
      header: "Data",
      cell: (row) => new Date(row.datePerformed).toLocaleDateString("pt-BR"),
    },
    { accessorKey: "value", header: "Pontos", className: "text-right" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-hidden"  />
        <DialogContent className="max-w-[95vw] sm:max-w-lg bg-[#010d26] border-2 border-[#0126fb] text-white max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#0126fb] scrollbar-track-[#010d26] overflow-x-hidden">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback>{user?.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {user?.name}
                </DialogTitle>
                <p className="text-sm text-gray-400">
                  Total de Pontos:{" "}
                  <span className="font-bold text-[#f5b719]">
                    {user?.totalPoints}
                  </span>
                </p>
              </div>
            </div>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
            </DialogClose>
          </DialogHeader>
          <div className="mt-4 overflow-x-auto">
            {isLoading ? (
              <div className="w-full h-auto rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-4 sm:p-6 text-white shadow-lg flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
                <p className="mt-4 text-lg text-gray-400">
                  Preparando as tags...
                </p>
              </div>
            ) : (
              <CustomTable<UserTag>
                title="Histórico de Pontos"
                columns={userTagsColumns}
                data={userTags}
                filterColumns={["description"]}
                onDelete={(row) => handleDeleteTag(row.id)}
                itemsPerPage={4}
                type="onlyDelete"
              />
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default UserTagsModal;
