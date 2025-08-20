/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma, TagTemplate } from "@prisma/client";
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
import { Loader2, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FullJRPointsReport,
  FullJRPointsSolicitation,
} from "./SolicitationsBoard";
import { format } from "date-fns";
import HistoryItemDetailsModal from "./HistoryItemDetailsModal";

interface UserTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserRankingInfo | null;
  snapshots: Prisma.UserSemesterScoreGetPayload<{
    include: {
      tags: { include: { assigner: true; actionType: true } };
      user: true;
    };
  }>[];
  allTagTemplates: TagTemplate[];
}

export type UserTagWithRelations = Prisma.TagGetPayload<{
  include: {
    assigner: true;
    actionType: true;
    jrPointsVersion: true;
    template: true;
  };
}>;

interface HistoryData {
  tags: UserTagWithRelations[];
  solicitations: FullJRPointsSolicitation[];
  reports: FullJRPointsReport[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const ENTERPRISE_USER_ID = "enterprise-points-id";

const UserTagsModal = ({
  isOpen,
  onClose,
  user,
  snapshots,
  allTagTemplates,
}: UserTagsModalProps) => {
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState("current");
  const [viewingItem, setViewingItem] = useState<any>(null);

  const userSnapshots = useMemo(
    () => snapshots?.filter((s) => s.userId === user?.id) || [],
    [snapshots, user]
  );

  const { data: historyData, isLoading } = useQuery<HistoryData>({
    queryKey: ["userHistoryDetails", user?.id, selectedView],
    queryFn: async () => {
      const isEnterprise = user?.id === ENTERPRISE_USER_ID;
      let endpoint = "";

      if (isEnterprise) {
        endpoint =
          selectedView === "current"
            ? `${API_URL}/api/enterprise-points/history`
            : `${API_URL}/api/enterprise-points/snapshots/${selectedView}`;
      } else {
        endpoint =
          selectedView === "current"
            ? `${API_URL}/api/users/${user!.id}/history`
            : `${API_URL}/api/users/${user!.id}/snapshots/${selectedView}`;
      }
      const { data } = await axios.get(endpoint);
      return data;
    },
    enabled: isOpen && !!user?.id,
    initialData: { tags: [], solicitations: [], reports: [] },
  });

  const { mutate: unlinkTag, isPending: isUnlinking } = useMutation({
    mutationFn: (tagId: string) =>
      axios.delete(`${API_URL}/api/jr-points/tags/${tagId}`),
    onSuccess: () => {
      toast.success("Tag desvinculada com sucesso!");
      queryClient.invalidateQueries({
        queryKey: ["userHistoryDetails", user?.id, "current"],
      });
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Falha ao desvincular a tag.", {
        description: error.response?.data?.message,
      }),
  });

  const tagsWithStreakInfo = useMemo(() => {
    if (!historyData?.tags || !allTagTemplates) return [];
    const sortedTags = [...historyData.tags].sort(
      (a, b) =>
        new Date(b.datePerformed).getTime() -
        new Date(a.datePerformed).getTime()
    );
    const processedTags = new Map<
      string,
      UserTagWithRelations & { bonus: number }
    >();

    for (const tag of sortedTags) {
      const template = allTagTemplates.find((t) => t.id === tag.templateId);
      if (!template || !template.isScalable) {
        processedTags.set(tag.id, { ...tag, bonus: 0 });
        continue;
      }

      const previousTag = Array.from(processedTags.values()).find(
        (t) => t.templateId === tag.templateId
      );

      let bonus = 0;
      if (previousTag) {
        const previousValue = previousTag.value - previousTag.bonus;
        bonus = tag.value - previousValue;
      } else {
        bonus = tag.value - template.baseValue;
      }

      processedTags.set(tag.id, { ...tag, bonus: bonus === 0 ? 0 : bonus });
    }

    return Array.from(processedTags.values()).sort(
      (a, b) =>
        new Date(b.datePerformed).getTime() -
        new Date(a.datePerformed).getTime()
    );
  }, [historyData?.tags, allTagTemplates]);

  const handleDeleteTag = (tagId: string) => unlinkTag(tagId);

  // --- DEFINIÇÕES DE COLUNAS CORRIGIDAS ---
  const tagColumns: ColumnDef<UserTagWithRelations>[] = [
    { accessorKey: 'template', header: 'Título', cell: (row) => row.template?.name},
    { accessorKey: "description", header: "Descrição" },
    {
      accessorKey: "actionType",
      header: "Tipo",
      cell: (row) => row.actionType?.name || "N/A",
    },
    {
      accessorKey: "datePerformed",
      header: "Data",
      cell: (row) => format(new Date(row.datePerformed), "dd/MM/yyyy"),
    },
    {
      accessorKey: "value",
      header: "Pontos",
      className: "text-right font-semibold",
      cell: (row) => (
        <div className="flex flex-col items-end">
          <span className="text-base text-white">{row.value}</span>
          {row.template?.isScalable && row.template?.escalationValue && (
            <div
              className={`flex items-center text-xs ${
                row.template?.escalationValue > 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              <span>
                (
                {row.template?.escalationValue > 0
                  ? `+${row.template?.escalationValue}`
                  : row.template?.escalationValue}{" "}
                streak)
              </span>
            </div>
          )}
        </div>
      ),
    },
  ];

  const solicitationColumns: ColumnDef<FullJRPointsSolicitation>[] = [
    {
      accessorKey: "description",
      header: "Descrição",
      cell: (row) => (
        <p className="truncate max-w-[250px]">{row.description}</p>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant={
            row.status === "APPROVED"
              ? "default"
              : row.status === "REJECTED"
                ? "destructive"
                : "secondary"
          }
        >
          {row.status === "APPROVED"
            ? "Aprovado"
            : row.status === "REJECTED"
              ? "Rejeitado"
              : "Em análise"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Data do Pedido",
      cell: (row) => format(new Date(row.createdAt), "dd/MM/yyyy"),
    },
  ];

  const reportColumns: ColumnDef<FullJRPointsReport>[] = [
    {
      accessorKey: "description",
      header: "Descrição",
      cell: (row) => (
        <p className="truncate max-w-[250px]">{row.description}</p>
      ),
    },
    {
      accessorKey: "tag",
      header: "Tag Contestada",
      cell: (row) => row.tag.description,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant={
            row.status === "APPROVED"
              ? "default"
              : row.status === "REJECTED"
                ? "destructive"
                : "secondary"
          }
        >
          {row.status === "APPROVED"
            ? "Aprovado"
            : row.status === "REJECTED"
              ? "Rejeitado"
              : "Em análise"}
        </Badge>
      ),
    },
  ];

  const selectedSnapshot = userSnapshots.find((s) => s.id === selectedView);
  const totalPoints =
    selectedView === "current"
      ? user?.totalPoints
      : selectedSnapshot?.totalPoints;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
          <DialogContent
            className="w-[80vw] max-w-[80vw] sm:max-w-[80vw]  scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent overflow-auto
              max-h-[90vh] bg-[#010d26] border-2 border-[#0126fb] text-white flex flex-col"
          >
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user?.imageUrl || undefined} />
                    <AvatarFallback>
                      {user?.name.substring(0, 2)}
                    </AvatarFallback>
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
            <div className="mt-4 flex-grow w-full overflow-hidden">
              {isLoading || isUnlinking ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
                  <p className="mt-4 text-lg text-gray-400">
                    Carregando histórico...
                  </p>
                </div>
              ) : (
                <div className="h-full w-full space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#0126fb] scrollbar-track-[#010d26] pr-4">
                  <CustomTable<UserTagWithRelations>
                    title={`Extrato de Pontos (${selectedView === "current" ? "Atual" : selectedSnapshot?.semester})`}
                    columns={tagColumns}
                    data={tagsWithStreakInfo}
                    filterColumns={["description"]}
                    onDelete={
                      selectedView === "current"
                        ? (row) => handleDeleteTag(row.id)
                        : undefined
                    }
                    itemsPerPage={5}
                    onRowClick={(item) =>
                      setViewingItem({ type: "tag", data: item })
                    }
                    type={"onlyDelete"}
                  />
                  <CustomTable<FullJRPointsSolicitation>
                    title="Histórico de Solicitações"
                    columns={solicitationColumns}
                    data={historyData.solicitations}
                    filterColumns={["description", "status"]}
                    itemsPerPage={5}
                    type="onlyView"
                    onRowClick={(item) =>
                      setViewingItem({ type: "solicitation", data: item })
                    }
                  />
                  <CustomTable<FullJRPointsReport>
                    title="Histórico de Recursos"
                    columns={reportColumns}
                    data={historyData.reports}
                    onRowClick={(item) =>
                      setViewingItem({ type: "report", data: item })
                    }
                    filterColumns={["description", "status"]}
                    itemsPerPage={5}
                    type="onlyView"
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <HistoryItemDetailsModal
        item={viewingItem}
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
      />
    </>
  );
};

export default UserTagsModal;
