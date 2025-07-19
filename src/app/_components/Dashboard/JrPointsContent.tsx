"use client";
import { Award, Eye, EyeOff } from "lucide-react";
import CustomCard from "../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { JrPointIconBlue } from "../Global/JrPointsIcon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useState } from "react";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { checkUserPermission } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  myPoints: number;
  enterprisePoints: number;
  rankingData: RankingItem[];
  initialIsHidden: boolean; // Recebe os dados do ranking como prop
}

const JrPointsContent = ({
  myPoints,
  rankingData,
  enterprisePoints,
  initialIsHidden,
}: JrPointsContentProps) => {
  const router = useRouter();
  const [isHidden, setIsHidden] = useState(initialIsHidden);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  // --- Definição das Colunas da Tabela ---
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
  const handleToggleRankingVisibility = async () => {
    setIsLoading(true);
    try {
      const newVisibility = !isHidden;
      const response = await fetch("/api/jr-points/ranking-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: newVisibility }),
      });

      if (!response.ok) {
        throw new Error("Falha ao atualizar a visibilidade do ranking.");
      }

      // Atualiza o estado local imediatamente para uma melhor experiência do usuário
      setIsHidden(newVisibility);
      toast.success(
        `Ranking agora está ${newVisibility ? "oculto" : "visível"}.`
      );

      // Opcional: router.refresh() para garantir que outros componentes na página sejam atualizados se necessário.
      router.refresh();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
          disabled={isLoading}
        >
          {isHidden ? (
            <Eye className="h-4 w-4 mr-2" />
          ) : (
            <EyeOff className="h-4 w-4 mr-2" />
          )}
          {isLoading
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
