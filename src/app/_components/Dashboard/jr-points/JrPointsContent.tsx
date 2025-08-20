"use client";
import { Award, Eye, EyeOff, Loader2 } from "lucide-react";
import CustomCard from "../../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { JrPointIconBlue } from "../../Global/JrPointsIcon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { checkUserPermission, exportToExcel } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { JrPointsPageData } from "@/app/(dashboard)/jr-points/page";
import axios from "axios";
import { TagWithAction } from "@/lib/schemas/pointsSchema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { EnterpriseSemesterScore, Prisma, Semester } from "@prisma/client";
import TimelineView from "./TimelineView";

// --- Tipagem para os Dados ---
// Define a estrutura de um item na tabela de ranking
export interface RankingItem {
  id: string;
  ranking: number;
  name: string;
  points: number;
  imageUrl: string;
}

interface JrPointsContentProps {
  initialData: {
    myPoints: number;
    enterprisePoints: number;
    enterpriseTags: TagWithAction[];
    rankingData: RankingItem[];
    initialIsHidden: boolean;
    usersTotalPoints?: number;
    enterpriseSemesterScores: EnterpriseSemesterScore[];
    allVersions: Prisma.JRPointsVersionGetPayload<{
      include: {
        _count: true;
      };
    }>[];
    allSemesters: Semester[];
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const JrPointsContent = ({ initialData }: JrPointsContentProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedEnterpriseView, setSelectedEnterpriseView] =
    useState("current");

  const { data, isLoading: isLoadingData } = useQuery({
    queryKey: ["jrPointsData"],
    queryFn: async () => {
      const { data: pageData }: { data: JrPointsPageData } = await axios.get(
        `${API_URL}/api/jr-points`
      );
      // Lógica de processamento que estava no servidor agora pode viver aqui
      const myPoints =
        pageData.usersRanking.find((u) => u.id === user?.id)?.totalPoints || 0;
      const rankingData = pageData.usersRanking
        .slice(0, 10)
        .map((u, index) => ({
          id: u.id,
          ranking: index + 1,
          name: u.name,
          points: u.totalPoints,
          imageUrl: u.imageUrl,
        }));

      const usersTotalPoints = pageData.usersRanking.reduce(
        (acc, user) => acc + user.totalPoints,
        0
      );

      return {
        enterprisePoints: pageData.enterprisePoints,
        rankingData,
        myPoints,
        usersTotalPoints,
        enterpriseSemesterScores: pageData.enterpriseSemesterScores,
        allVersions: pageData.allVersions,
        allSemesters: pageData.allSemesters,
        enterpriseTags: pageData.enterpriseTags,
        initialIsHidden: pageData.rankingIsHidden,
      };
    },
    initialData: initialData,
  });

  const { data: enterpriseHistoryTags, isLoading: isLoadingEnterpriseHistory } =
    useQuery({
      queryKey: ["enterpriseHistoryTags", selectedEnterpriseView],
      queryFn: async (): Promise<TagWithAction[]> => {
        if (selectedEnterpriseView === "current") {
          return data?.enterpriseTags || [];
        }
        // Chama a API que busca as tags de um snapshot específico da empresa
        const { data: snapshotTags } = await axios.get(
          `${API_URL}/api/enterprise-points/snapshots/${selectedEnterpriseView}/tags`
        );
        return snapshotTags;
      },
      enabled: !!data && selectedEnterpriseView !== "current",
    });

  const { mutate: toggleVisibility, isPending: isToggling } = useMutation({
    mutationFn: (newVisibility: boolean) =>
      axios.patch(`${API_URL}/api/jr-points/ranking-status`, {
        isHidden: newVisibility,
      }),

    // Atualização Otimista para feedback instantâneo
    onMutate: async (newVisibility: boolean) => {
      await queryClient.cancelQueries({ queryKey: ["jrPointsData"] });
      const previousData = queryClient.getQueryData<typeof initialData>([
        "jrPointsData",
      ]);
      queryClient.setQueryData(
        ["jrPointsData"],
        (oldData: {
          myPoints: number;
          enterprisePoints: number;
          rankingData: RankingItem[];
          enterpriseTags: TagWithAction[];
          initialIsHidden: boolean;
        }) => ({
          ...(oldData as typeof initialData),
          initialIsHidden: newVisibility,
        })
      );
      return { previousData };
    },
    onError: (err, newVisibility, context) => {
      // Reverte em caso de erro
      if (context?.previousData) {
        queryClient.setQueryData(["jrPointsData"], context.previousData);
      }
      toast.error("Falha ao atualizar a visibilidade.");
    },
    // Garante a consistência final com o servidor
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["jrPointsData"] });
    },
  });

  // --- Dados e Handlers ---
  const {
    myPoints,
    rankingData,
    usersTotalPoints,
    enterprisePoints,
    enterpriseTags,
    enterpriseSemesterScores,
    allVersions,
    allSemesters,
    initialIsHidden: isHidden,
  } = data || initialData;
  console.log(enterpriseTags, enterprisePoints)
  const handleToggleRankingVisibility = () => toggleVisibility(!isHidden);

  const rankingColumns: ColumnDef<RankingItem>[] = [
    {
      accessorKey: "ranking",
      header: "Ranking",
    },
    {
      accessorKey: "name",
      header: "Nome",
      // CORREÇÃO: Usando a função 'cell' para renderizar um componente customizado
      // que inclui a imagem e o nome.
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={row.imageUrl}
              alt={row.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-[#0126fb] text-xs">
              {row.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "points",
      header: "Pontos",
      // Estilização para destacar os pontos
      className: "text-right font-bold text-[#f5b719]",
    },
  ];

  const tagColumns: ColumnDef<TagWithAction>[] = [
    { accessorKey: "description", header: "Descrição" },
    {
      accessorKey: "actionType",
      header: "Tipo",
      cell: (row) => row.actionType?.name || "N/A",
    },

    {
      accessorKey: "datePerformed",
      header: "Data",
      cell: (row) => new Date(row.datePerformed).toLocaleDateString("pt-BR"),
    },
    {
      accessorKey: "jrPointsVersion",
      header: "Versão",
      cell: (row) => row?.jrPointsVersion?.versionName,
    },
    {
      accessorKey: "assignerId",
      header: "Atribuído por",
      cell: (row) => row.assigner?.name || "N/A",
    },
    {
      accessorKey: "isFromAppeal",
      header: "Recurso?",
      cell: (row) => (row.isFromAppeal ? "Sim" : "Não"),
    },
    { accessorKey: "value", header: "Pontos", className: "text-right" },
  ];

  const handleEnterpriseTagsExport = () => {
    if (enterpriseTags.length === 0) return alert("Nenhum dado para exportar");
    const dataToExport = data.enterpriseTags.map((u) => ({
      Descricao: u.description,
      Valor: u.value,
      Total_Pontos_Empresa: enterprisePoints,
      Data_Realizacao: new Date(u.datePerformed)
        .toLocaleDateString()
        .split("T")[0],
      Data_Exportacao: new Date().toLocaleDateString().split("T")[0],
    }));
    exportToExcel(dataToExport, "tags_empresa_jr_points");
  };

  const isDirector = checkUserPermission(user, DIRECTORS_ONLY);

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center mt-20">
        <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
      </div>
    );
  }

  const selectedEnterpriseSnapshot = enterpriseSemesterScores?.find(
    (s) => s.id === selectedEnterpriseView
  );
  const displayEnterprisePoints =
    selectedEnterpriseView === "current"
      ? enterprisePoints
      : selectedEnterpriseSnapshot?.value;
  const displayEnterpriseTags =
    selectedEnterpriseView === "current"
      ? enterpriseTags
      : enterpriseHistoryTags;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 mb-8">
        <CustomCard
          type={"introduction"}
          title="JR Points"
          value={0} // Este valor poderia ser o total de pontos da empresa
          description="Acompanhe o ranking de pontos dos sócios e a pontuação geral da empresa."
          icon={JrPointIconBlue}
        />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <CustomCard
            type="link"
            title="Meus Pontos"
            value={myPoints}
            description="Veja o seu extrato detalhado de pontos."
            href="/meus-pontos"
            icon={Award}
            className="col-span-1"
          />
          <CustomCard
            type="link"
            title="Total de Pontos dos Membros"
            value={usersTotalPoints!}
            description="Pontuação geral da empresa"
            icon={JrPointIconBlue}
            className="col-span-1"
          />
          <CustomCard
            type="link"
            title="Pontuação da Empresa"
            value={displayEnterprisePoints ?? 0}
            description="Pontuação geral da empresa"
            icon={JrPointIconBlue}
            className="col-span-1"
          />
        </div>
      </div>

      {isDirector && (
        <Button
          className="bg-[#0126fb] mb-4 hover:bg-[#0126fb]/70"
          onClick={handleToggleRankingVisibility}
          disabled={isToggling}
        >
          {isHidden ? (
            <Eye className="h-4 w-4 mr-2" />
          ) : (
            <EyeOff className="h-4 w-4 mr-2" />
          )}
          {isToggling
            ? "Atualizando..."
            : isHidden
              ? "Mostrar Ranking"
              : "Ocultar Ranking"}
        </Button>
      )}

      <div className="space-y-4">
        <CustomTable<RankingItem>
          title="Ranking de Pontos"
          data={isHidden && !isDirector ? [] : rankingData}
          message="Opa, parece que tem algo acontecendo..."
          columns={rankingColumns}
          filterColumns={["name", "points"]} // A busca irá filtrar apenas pelo nome
          itemsPerPage={10}
          type="onlyView"
        />

        {/* --- TABELA DE TAGS DA EMPRESA ATUALIZADA --- */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
            <h2 className="text-2xl font-bold text-[#0126fb]">
              Tags da Empresa
            </h2>
            <div className="w-full sm:w-auto flex-shrink-0">
              <Select
                value={selectedEnterpriseView}
                onValueChange={setSelectedEnterpriseView}
              >
                <SelectTrigger className="w-full sm:w-[240px] bg-[#00205e] border-[#0126fb] text-white">
                  <SelectValue placeholder="Selecione um período" />
                </SelectTrigger>
                <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                  <SelectItem className="bg-transparent" value="current">
                    Placar Atual
                  </SelectItem>
                  {enterpriseSemesterScores?.map((score) => (
                    <SelectItem key={score.id} value={score.id}>
                      Histórico: {score.semester} ({score.value} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isLoadingEnterpriseHistory ? (
            <div className="flex justify-center py-10 bg-[#010d26]">
              <Loader2 className="h-8 w-8 animate-spin text-[#f5b719]" />
            </div>
          ) : (
            <CustomTable<TagWithAction>
              title="Extrato de Pontos"
              columns={tagColumns}
              data={displayEnterpriseTags || []}
              filterColumns={["description"]}
              itemsPerPage={6}
              type={"onlyView"}
              onExportClick={
                isDirector ? handleEnterpriseTagsExport : undefined
              }
            />
          )}

          <TimelineView
            versions={allVersions || []}
            semesters={allSemesters || []}
          />
        </div>
      </div>
    </>
  );
};

export default JrPointsContent;
