"use client";
import { EstrategyObjectiveWithGoals } from "@/app/(dashboard)/atualizar-estrategia/page";
import { Accordion } from "@/components/ui/accordion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ObjectiveItem from "./ObjectiveItem";

interface Props {
  estrategyObjectives: EstrategyObjectiveWithGoals[];
}

export function StrategyObjectivesSection({ estrategyObjectives }: Props) {
  const router = useRouter();

  const handleUpdate = async (
    endpoint: "objectives" | "goals",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { id: string; [key: string]: any }
  ) => {
 
    try {
      const res = await fetch(`/api/house-goals/${endpoint}/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Falha ao atualizar.`);
      }

      toast.success(`${endpoint === "objectives" ? "Objetivo" : "Meta"} atualizado!`);
      router.refresh();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Erro ao atualizar", { description: error.message });
    }
  };

  return (
    <div className="space-y-4 mt-6">
       <h3 className="text-xl text-[#f5b719] font-bold">Objetivos e Indicadores</h3>
       <Accordion type="multiple" className="w-full space-y-3">
        {estrategyObjectives.map((objective) => (
          <ObjectiveItem
            key={objective.id}
            initialObjective={objective}
            onUpdate={handleUpdate}
          />
        ))}
      </Accordion>
    </div>
  );
}
