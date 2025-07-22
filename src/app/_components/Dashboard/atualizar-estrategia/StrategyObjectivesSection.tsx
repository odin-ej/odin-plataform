/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Accordion } from "@/components/ui/accordion";
import { toast } from "sonner";
import ObjectiveItem from "./ObjectiveItem";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { EstrategyObjectiveWithGoals } from "@/app/(dashboard)/atualizar-estrategia/page";

interface Props {
  // A propriedade agora é 'initialObjectives' para clareza
  initialObjectives: EstrategyObjectiveWithGoals[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Tipagem para os dados que a mutação vai receber
interface UpdateData {
  endpoint: "objectives" | "goals";
  id: string;
  [key: string]: any; // Permite outros campos como 'name', 'description', etc.
}

export function StrategyObjectivesSection({ initialObjectives }: Props) {
  const queryClient = useQueryClient();

  // --- HOOK DE MUTAÇÃO PARA ATUALIZAR OBJETIVO OU META ---
  const { mutate: updateItem, isPending: isUpdating } = useMutation({
    mutationFn: async (data: UpdateData) => {
      // A lógica de fetch agora vive aqui dentro
      const { endpoint, id, ...payload } = data;
      const res = await axios.patch(`${API_URL}/house-goals/${endpoint}/${id}`, payload);
      return res.data;
    },
    onSuccess: (data, variables) => {
      // Invalida a query principal para forçar a atualização da UI
      queryClient.invalidateQueries({ queryKey: ['strategyData'] });
      // O feedback ao usuário também fica centralizado aqui
      toast.success(`${variables.endpoint === "objectives" ? "Objetivo" : "Meta"} atualizado!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Falha ao atualizar.";
      toast.error("Erro ao atualizar", { description: errorMessage });
    },
  });

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-xl text-[#f5b719] font-bold">Objetivos e Indicadores</h3>
      <Accordion type="multiple" className="w-full space-y-3">
        {/* Usamos os dados iniciais para a primeira renderização */}
        {initialObjectives.map((objective) => (
          <ObjectiveItem
            key={objective.id}
            initialObjective={objective}
            // Passamos a função 'mutate' e o estado de 'loading' para o filho
            onUpdate={updateItem}
            isUpdating={isUpdating}
          />
        ))}
      </Accordion>
    </div>
  );
}