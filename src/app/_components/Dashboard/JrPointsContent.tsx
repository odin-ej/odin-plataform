"use client";
import { Award, Eye, EyeOff, Loader2 } from "lucide-react";
import CustomCard from "../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { JrPointIconBlue } from "../Global/JrPointsIcon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { checkUserPermission } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { JrPointsPageData } from "@/app/(dashboard)/jr-points/page";
import axios from "axios";

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
    rankingData: RankingItem[];
    initialIsHidden: boolean;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const JrPointsContent = ({ initialData }: JrPointsContentProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      return {
        enterprisePoints: pageData.enterprisePoints,
        rankingData,
        myPoints,
        initialIsHidden: pageData.rankingIsHidden,
      };
    },
    initialData: initialData,
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
      queryClient.setQueryData(["jrPointsData"], (oldData: { myPoints: number; enterprisePoints: number; rankingData: RankingItem[]; initialIsHidden: boolean; }) => ({
        ...(oldData as typeof initialData),
        initialIsHidden: newVisibility,
      }));
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
    enterprisePoints,
    initialIsHidden: isHidden,
  } = data || initialData;
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

  const isDirector = checkUserPermission(user, DIRECTORS_ONLY);

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center mt-20">
        <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
      </div>
    );
  }

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CustomCard
            type="link"
            title="Meus Pontos"
            value={myPoints}
            description="Veja o seu extrato detalhado de pontos."
            href="/meus-pontos"
            icon={Award}
          />
          <CustomCard
            type="link"
            href="/jr-points/nossa-empresa"
            title="Pontuação da Empresa"
            value={enterprisePoints}
            description="Pontuação geral da empresa"
            icon={JrPointIconBlue}
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

      <CustomTable<RankingItem>
        title="Ranking de Pontos"
        data={isHidden && !isDirector ? [] : rankingData}
        message="Opa, parece que tem algo acontecendo..."
        columns={rankingColumns}
        filterColumns={["name", "points"]} // A busca irá filtrar apenas pelo nome
        itemsPerPage={10}
        type="onlyView"
      />
    </>
  );
};

export default JrPointsContent;
