/* eslint-disable @typescript-eslint/no-explicit-any */

import { Tag as UserTag } from "@prisma/client";
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

import { Loader2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getLabelForArea } from "./AdminActionsModal";

interface UserTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserRankingInfo | null;
}

type UserTagWithAssigner = UserTag & {
  assigner: {
    name: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const UserTagsModal = ({ isOpen, onClose, user }: UserTagsModalProps) => {
  const queryClient = useQueryClient();

  const { data: userTags = [], isLoading } = useQuery({
    queryKey: ["userTags", user?.id],
    queryFn: async (): Promise<UserTagWithAssigner[]> => {
      const { data } = await axios.get(`${API_URL}/api/users/${user!.id}/tags`);
      return data;
    },
    // Esta é a mágica: a query só é executada se o modal estiver aberto e um usuário selecionado
    enabled: isOpen && !!user?.id,
  });

  const { mutate: unlinkTag, isPending: isUnlinking } = useMutation({
    mutationFn: (tagId: string) =>
      axios.patch(`${API_URL}/api/tags/${tagId}`, { userPointsId: null }),
    onSuccess: () => {
      toast.success("Tag desvinculada com sucesso!");
      // Invalida tanto a query deste modal quanto a query principal da página de pontos
      queryClient.invalidateQueries({ queryKey: ["userTags", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Falha ao desvincular a tag.", {
        description: error.response?.data?.message,
      }),
  });

  const handleDeleteTag = (tagId: string) => {
    if (
      confirm(
        "Tem a certeza que quer desvincular esta tag do histórico do utilizador?"
      )
    ) {
      unlinkTag(tagId);
    }
  };

  const userTagsColumns: ColumnDef<UserTagWithAssigner>[] = [
    { accessorKey: "description", header: "Descrição" },
    { accessorKey: "assignerId", header: "Vinculado por", 
      cell: (row) => {
        const assigner = row?.assigner?.name;
        return assigner ? (
          <span className="text-[#f5b719]">{assigner}</span>
        ) : (
          <span className="text-gray-400">Desconhecido</span>
        );
      }
     },
    {
      accessorKey: "datePerformed",
      header: "Data",
      cell: (row) => new Date(row.datePerformed).toLocaleDateString("pt-BR"),
    },
    {accessorKey: "areas", header: "Áreas",
      cell: (row) => {
        const areas = row.areas;
        return areas ? (
          <>
            {areas.map((area) => (
              <span key={area} className="text-[#f5b719] text-xs">{getLabelForArea(area)}{" "}</span>
            ))}
          </>
        ) : (
          <span className="text-gray-400">Desconhecido</span>
        );
      }
     },
    { accessorKey: "value", header: "Pontos", className: "text-right" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-hidden" />
        <DialogContent className="max-w-[100vw] sm:max-w-lg md:max-w-3xl bg-[#010d26] border-2 border-[#0126fb] text-white max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#0126fb] scrollbar-track-[#010d26] overflow-x-hidden">
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
          <div className="mt-4 overflow-x-auto w-full">
            {isLoading || isUnlinking ? (
              <div className="w-full h-auto rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-4 sm:p-6 text-white shadow-lg flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
                <p className="mt-4 text-lg text-gray-400">
                  Preparando as tags...
                </p>
              </div>
            ) : (
              <CustomTable<UserTagWithAssigner>
                title="Histórico de Pontos"
                columns={userTagsColumns}
                data={userTags}
                filterColumns={["description", "datePerformed", "assigner", "value", "areas"]}
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
