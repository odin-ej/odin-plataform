/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tag as UserTag, Prisma } from "@prisma/client";
import { UserRankingInfo } from "@/lib/schemas/pointsSchema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import { toast } from "sonner";
import React, { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getLabelForArea } from "./AdminActionsModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface UserTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserRankingInfo | null;
  snapshots: Prisma.UserSemesterScoreGetPayload<{
    include: { tags: { include: { assigner: true }, actionType: true  }; user: true };
  }>[];
}

export type UserTagWithAssigner = UserTag & {
  assigner: { name: string } | null;
  
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const UserTagsModal = ({
  isOpen,
  onClose,
  user,
  snapshots,
}: UserTagsModalProps) => {
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState("current");

  const userSnapshots = useMemo(
    () => snapshots?.filter((s) => s.userId === user?.id) || [],
    [snapshots, user]
  );

  const { data: historyData = [], isLoading } = useQuery({
    queryKey: ["userHistory", user?.id, selectedView],
    queryFn: async (): Promise<
      | UserTagWithAssigner[]
      | Prisma.UserSemesterScoreGetPayload<{
          include: { tags: { include: { assigner: true } }; user: true };
        }>
    > => {
      if (selectedView === "current") {
        const { data } = await axios.get(
          `${API_URL}/api/users/${user!.id}/tags`
        );
        return data;
      }
      // Em um caso real, a API buscaria os detalhes do snapshot (incluindo as tags daquele período)
      // Por enquanto, exibimos a pontuação total do snapshot.
      const snapshotData = userSnapshots.find((s) => s.id === selectedView);
      return snapshotData
        ? snapshotData.tags.map((tag) => ({ ...tag, assigner: null })) || []
        : []; // Retorna as tags do snapshot ou um array vazio
    },
    enabled: isOpen && !!user?.id,
  });

  const { mutate: unlinkTag, isPending: isUnlinking } = useMutation({
    mutationFn: (tagId: string) => axios.delete(`${API_URL}/api/jr-points/tags/${tagId}`),
    onSuccess: () => {
      toast.success("Tag desvinculada com sucesso!");
      queryClient.invalidateQueries({
        queryKey: ["userHistory", user?.id, "current"],
      });
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Falha ao desvincular a tag.", {
        description: error.response?.data?.message,
      }),
  });

  const handleDeleteTag = (tagId: string) => {
    // A confirmação pode ser adicionada aqui se necessário
    unlinkTag(tagId);
  };

  const userTagsColumns: ColumnDef<UserTagWithAssigner>[] = [
    { accessorKey: "description", header: "Descrição" },
    {
      accessorKey: "assigner",
      header: "Atribuído por",
      cell: (row) =>
        row.assigner?.name || <span className="text-gray-400">Sistema</span>,
    },
    {
      accessorKey: "datePerformed",
      header: "Data",
      cell: (row) => new Date(row.datePerformed).toLocaleDateString("pt-BR"),
    },
    {
      accessorKey: "areas",
      header: "Áreas",
      cell: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.areas.map((area) => (
            <Badge key={area} className='bg-[#0126fb] text-white hover:bg-[#0126fb]/80 hover:text-white transition-colors'>
              {getLabelForArea(area)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "value",
      header: "Pontos",
      className: "text-right font-semibold",
    },
  ];

  const selectedSnapshot = userSnapshots.find((s) => s.id === selectedView);
  const totalPoints =
    selectedView === "current"
      ? user?.totalPoints
      : selectedSnapshot?.totalPoints;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
        <DialogContent className="max-w-[100vw] sm:max-w-lg md:max-w-3xl bg-[#010d26] border-2 border-[#0126fb] text-white max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#0126fb] scrollbar-track-[#010d26]">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                      {totalPoints}
                    </span>
                  </p>
                </div>
              </div>
              <Select value={selectedView} onValueChange={setSelectedView}>
                <SelectTrigger className="w-full sm:w-[220px] bg-transparent border-[#0126fb]">
                  <SelectValue placeholder="Ver Histórico" />
                </SelectTrigger>
                <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                  <SelectItem value="current">Pontos Atuais</SelectItem>
                  {userSnapshots.map((snap) => (
                    <SelectItem key={snap.id} value={snap.id}>
                      Snapshot - {snap.semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>
          <div className="mt-4 w-full overflow-x-hidden">
            {isLoading || isUnlinking ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
                <p className="mt-4 text-lg text-gray-400">
                  Carregando histórico...
                </p>
              </div>
            ) : (
              <div className="h-full w-full overflow-auto scrollbar-thin scrollbar-thumb-[#0126fb] scrollbar-track-[#010d26]">
                <CustomTable<UserTagWithAssigner>
                  title={`Histórico de Pontos (${selectedView === "current" ? "Atual" : selectedSnapshot?.semester})`}
                  columns={userTagsColumns}
                  data={historyData as UserTagWithAssigner[]}
                  filterColumns={["description"]}
                  onDelete={
                    selectedView === "current"
                      ? (row) => handleDeleteTag(row.id)
                      : undefined
                  }
                  itemsPerPage={5}
                  type={selectedView === "current" ? "onlyDelete" : "onlyView"}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default UserTagsModal;
