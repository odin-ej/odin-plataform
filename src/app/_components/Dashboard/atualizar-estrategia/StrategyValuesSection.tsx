/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Value } from ".prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ValueItem from "./ValueItem";

interface Props {
  values: Value[];
}

export function StrategyValuesSection({ values }: Props) {
  const router = useRouter();

  // Função centralizada para lidar com a atualização na API
  const handleUpdateDatabase = async (
    updatedData: Partial<Value> & { id: string }
  ) => {
    try {
      const res = await fetch(`/api/culture/values/${updatedData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Falha ao atualizar o valor.");
      }

      toast.success("Valor atualizado com sucesso!");
      // Sincroniza o cliente com o servidor, buscando os dados mais recentes.
      // Isso torna o estado local desnecessário.
      router.refresh();
    } catch (error: any) {
      toast.error("Erro ao atualizar", { description: error.message });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl text-[#f5b719] font-bold">Valores da Casinha</h3>
      {/* Mapeia diretamente sobre as props recebidas. router.refresh() cuidará da atualização. */}
      {values.map((value) => (
        <ValueItem
          key={value.id}
          initialValue={value}
          onUpdate={handleUpdateDatabase}
        />
      ))}
    </div>
  );
}

// Componente de item individual, com seu próprio estado de formulário
