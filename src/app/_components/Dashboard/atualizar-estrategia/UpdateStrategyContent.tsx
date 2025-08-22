/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  EstrategyObjectiveWithGoals,
  fullStrategy as fullStrategyType,
} from "@/app/(dashboard)/atualizar-estrategia/page";
import CustomCard from "../../Global/Custom/CustomCard";
import { Goal } from "lucide-react";
import { StrategySection } from "./StrategySection";
import { StrategyValuesSection } from "./StrategyValuesSection";
import { StrategyObjectivesSection } from "./StrategyObjectivesSection";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Value, EstrategyObjective } from "@prisma/client";

interface UpdateStrategyContentProps {
  estrategyObjectives: EstrategyObjectiveWithGoals[];
  fullStrategy: fullStrategyType;
}

enum Item {
  estrategyPlan = "estrategyPlan",
  values = "values",
  objectives = "objectives",
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const fetchStrategyData = async (): Promise<UpdateStrategyContentProps> => {
  const response = await axios.get(`${API_URL}/api/update-strategy`);

  if (!response.data) {
    throw new Error("Falha ao buscar os dados da página.");
  }

  const data = await response.data;

  const result = {
    estrategyObjectives:
      data.estrategyObjectives as EstrategyObjectiveWithGoals[],
    fullStrategy: {
      values: data.values as Value[],
      estrategyObjectives: data.estrategyObjectives as EstrategyObjective[],
      id: data.id,
      propose: data.propose,
      mission: data.mission,
      vision: data.vision,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as fullStrategyType,
  };
  console.log(result);
  // CRÍTICO: Retorne uma CÓPIA PROFUNDA para o initialData
  // Isso impede que qualquer mutação posterior no servidor ou cliente afete o objeto original.
  return structuredClone(result); // OU JSON.parse(JSON.stringify(result));
};

const UpdateStrategyContent = ({
  estrategyObjectives,
  fullStrategy,
}: UpdateStrategyContentProps) => {
  const [item, setItem] = useState<Item>(Item.estrategyPlan);

  const queryClient = useQueryClient();

  // --- HOOK PARA GERENCIAR OS DADOS ---
  const { data, isLoading, isError } = useQuery({
    queryKey: ["strategyData"], // Chave de cache para estes dados
    queryFn: fetchStrategyData, // Função que busca os dados
    initialData: { estrategyObjectives, fullStrategy }, // "Hidrata" com os dados do servidor!
  });
  // --- HOOK PARA ATUALIZAR A ESTRATÉGIA ---
  const { mutate: updateStrategy, isPending: isUpdating } = useMutation({
    mutationFn: (newData: { field: string; value: string }) =>
      axios.patch(`${API_URL}/api/culture`, { [newData.field]: newData.value }),
    onSuccess: () => {
      // Invalida o cache, forçando o useQuery a buscar os dados atualizados
      toast.success("Valor atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["strategyData"] });
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || "Falha ao atualizar o valor.";
      toast.error("Erro ao atualizar", { description: errorMessage });
      console.error("Falha ao atualizar a estratégia", error);
    },
  });

  const { mutate: updateValue, isPending: isUpdatingValue } = useMutation({
    mutationFn: async (valueData: Partial<Value> & { id: string }) => {
      // A lógica de chamada da API agora vive aqui
      const { id, ...payload } = valueData;
      const { data } = await axios.patch(
        `${API_URL}/api/culture/values/${id}`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      // Ao sucesso, invalida os dados principais para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ["strategyData"] });
      toast.success("Valor atualizado com sucesso!");
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || "Falha ao atualizar o valor.";
      toast.error("Erro ao atualizar", { description: errorMessage });
    },
  });
  console.log(data);
  // Mostra o estado de carregamento se o TanStack Query estiver buscando os dados
  if (isLoading) return <div>Carregando estratégia...</div>;
  if (isError) return <div>Erro ao carregar os dados.</div>;
  return (
    <>
      <CustomCard
        title="Atualizar Estratégia"
        icon={Goal}
        type="introduction"
        description="Atualize a estratégia da Casinha para o ano atual."
        value={0}
      />

      <div className="mt-6">
        <h2 className="text-xl sm:text-3xl text-center font-bold text-white">
          O que deseja atualizar?
        </h2>
        <div className="flex flex-col sm:flex-row pb-6 w-full items-center justify-center mt-3 gap-4">
          <Button
            className={cn(
              "bg-transparent hover:text-[#0126fb] hover:!bg-transparent",
              { "text-[#f5b719] bg-[#f5b719]/10": item === Item.estrategyPlan }
            )}
            disabled={item === Item.estrategyPlan}
            onClick={() => setItem(Item.estrategyPlan)}
          >
            Estratégia
          </Button>
          <Button
            className={cn(
              "bg-transparent hover:text-[#0126fb] hover:!bg-transparent",
              { "text-[#f5b719] bg-[#f5b719]/10": item === Item.values }
            )}
            disabled={item === Item.values}
            onClick={() => setItem(Item.values)}
          >
            Valores
          </Button>
          <Button
            className={cn(
              "bg-transparent hover:text-[#0126fb] hover:!bg-transparent",
              { "text-[#f5b719] bg-[#f5b719]/10": item === Item.objectives }
            )}
            disabled={item === Item.objectives}
            onClick={() => setItem(Item.objectives)}
          >
            Objetivos e Indicadores
          </Button>
        </div>
      </div>

      {item === Item.estrategyPlan && (
        <div className="space-y-2">
          <StrategySection
            field="propose"
            label="Propósito"
            value={data.fullStrategy.propose}
            isUpdating={isUpdating}
            onUpdate={updateStrategy}
          />
          <StrategySection
            field="mission"
            label="Missão"
            value={data.fullStrategy.mission}
            isUpdating={isUpdating}
            onUpdate={updateStrategy}
          />
          <StrategySection
            field="vision"
            label="Visão"
            value={data.fullStrategy.vision}
            isUpdating={isUpdating}
            onUpdate={updateStrategy}
          />
        </div>
      )}
      {item === Item.values && (
        <>
          <StrategyValuesSection
            values={data.fullStrategy.values}
            onUpdateValue={updateValue} // Passa a função de mutação
            isUpdatingValue={isUpdatingValue}
          />
        </>
      )}

      {item === Item.objectives && (
        <>
          <StrategyObjectivesSection
            initialObjectives={data.estrategyObjectives}
          />
        </>
      )}
    </>
  );
};

export default UpdateStrategyContent;
