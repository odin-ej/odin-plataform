"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { EstrategyObjective, Goal } from "@prisma/client";
import CustomCard from "../../Global/Custom/CustomCard";
import { Goal as GoalIcon, Loader2 } from "lucide-react";
import EstrategyObjectiveCard from "./EstrategyObjectiveCard";

// Tipagens (podem vir do page.tsx se exportadas)
export type EstrategyObjectiveWithGoals = EstrategyObjective & {
  goals: Goal[];
};
export interface MetasPageProps {
  estrategyObjectives: EstrategyObjectiveWithGoals[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Função que o TanStack Query usará para re-buscar os dados no cliente
const fetchMetasData = async (): Promise<MetasPageProps> => {
  const { data } = await axios.get(`${API_URL}/api/house-goals`);
  return { estrategyObjectives: data };
};

const MetasContent = ({ initialData }: { initialData: MetasPageProps }) => {
  // --- QUERY PRINCIPAL (Gerencia todos os dados da página) ---
  const { data, isLoading, isError } = useQuery({
    queryKey: ["metasData"], // Chave de cache para esta página
    queryFn: fetchMetasData,
    initialData: initialData, // "Hidrata" com os dados do servidor
  });

  // --- ESTADOS DE CARREGAMENTO E ERRO ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-20">
        <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-white text-center">
        Erro ao carregar as metas.
      </div>
    );
  }

  // Usamos os dados do 'data' do useQuery como fonte da verdade
  const { estrategyObjectives } = data;

  return (
    <>
      <CustomCard
        type="introduction"
        title={`Metas da Casinha - ${new Date().getFullYear()}`}
        icon={GoalIcon}
        description="Acompanhe as metas da Casinha para o ano atual."
        value={0}
      />

      <div className="flex flex-col gap-4">
        {estrategyObjectives.map((estrategyObjective, index) => (
          <EstrategyObjectiveCard
            key={estrategyObjective.id}
            estrategyObjective={estrategyObjective}
            index={index + 1}
          />
        ))}
      </div>

      <div className="mt-10 space-y-6">
        <h2 className="text-xl sm:text-4xl text-center font-bold text-white">
          Entenda Sobre
        </h2>

        {estrategyObjectives.map((estrategyObjective, index) => (
          <div
            key={estrategyObjective.id}
            aria-labelledby={`objective-title-${index}`}
            className="rounded-xl border border-[#0126fb] bg-[#010d26] p-4 sm:p-6 shadow-md"
          >
            <h3
              id={`objective-title-${index}`}
              className="text-lg sm:text-xl font-semibold text-[#f5b719]"
            >
              {index + 1}º Objetivo Estratégico: {estrategyObjective.objective}
            </h3>

            <p className="mt-2 text-sm sm:text-base text-gray-300">
              {estrategyObjective.description}
            </p>

            <div className="mt-4 space-y-3">
              <h4 className="text-base font-medium text-white">Metas:</h4>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-400">
                {estrategyObjective.goals.map((goal) => (
                  <li key={goal.id}>
                    <span className="text-white font-semibold">
                      {goal.title}:
                    </span>{" "}
                    {goal.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default MetasContent;
