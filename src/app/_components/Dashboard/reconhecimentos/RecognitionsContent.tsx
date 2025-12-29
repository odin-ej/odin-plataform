/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import {
  Trophy,
  Calendar,
  Medal,
  Star,
  ArrowRight,
  Settings,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteRecognition,
  getAllRecognitionModels,
  getYearlyValueSchedule,
} from "@/lib/actions/recognitions";
import CustomCard from "../../Global/Custom/CustomCard";
import CasinhaWinnerCard from "./CasinhaWinnerCard";
import { checkUserPermission, cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import CreateScheduleModal from "./CreateScheduleModal";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { useAuth } from "@/lib/auth/AuthProvider";
import AssignRecognitionModal from "./AssignRecognitionModal";
import CreateModelModal from "./CreateModelModal";
import ManageModelsList from "./ManageModelsList";
import ModalConfirm from "../../Global/ModalConfirm";
import { toast } from "sonner";

interface RecognitionsContentProps {
  initialData: any;
}

const RecognitionsContent = ({ initialData }: RecognitionsContentProps) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(
    currentMonth - 1
  );

  const { user } = useAuth();

  const isDirector = checkUserPermission(user!, DIRECTORS_ONLY);

  const { data: schedule } = useQuery({
    queryKey: ["yearlySchedule", currentYear],
    queryFn: () => getYearlyValueSchedule(currentYear),
    initialData: initialData,
  });

  const { data: allModels } = useQuery({
    queryKey: ["allRecognitionModels"],
    queryFn: () => getAllRecognitionModels(), // Action que traz todos, inclusive isActive: false
  });

  const { mutate: deleteCasinhaRecognition, isPending: isDeleting } =
    useMutation({
      mutationFn: (recognitionId: string) => {
        return deleteRecognition(recognitionId);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["yearlySchedule", currentYear],
        });
        toast.success("Reconhecimento deletado com sucesso!");
        setItemToDelete(null);
      },
      onError: () => {
        toast.error("Erro ao deletar reconhecimento.");
      },
    });

  // Dados do mês selecionado no slider de valores
  const activeMonthData = useMemo(() => {
    return schedule?.[selectedMonthIndex];
  }, [schedule, selectedMonthIndex]);

  const monthsLabel = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return (
    <div className="p-4 space-y-8 pb-20">
      <CustomCard
        title="Hall da Fama"
        value={0}
        type="introduction"
        description="Onde celebramos aqueles que vivem nossos valores intensamente."
        icon={Trophy}
      />

      {/* --- SEÇÃO 1: CRONOGRAMA DE VALORES (CARROSSEL) --- */}
      <section className="relative bg-[#010d26] rounded-3xl p-6 border border-[#0126fb]/20 overflow-hidden min-h-[180px]">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Medal size={120} className="text-[#f5b719]" />
        </div>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-[#f5b719]" />
            <h2 className="text-xl font-bold text-white">
              Ciclo de Valores {currentYear}
            </h2>
          </div>

          {/* BOTÃO ADICIONADO AQUI */}
          <div className="cursor-pointer z-1 relative">
            {isDirector && <CreateScheduleModal />}
          </div>
        </div>

        <Carousel className="w-full">
          <CarouselContent className="-ml-2 md:-ml-4">
            {schedule?.map((item: any, index: number) => (
              <CarouselItem
                key={item.id}
                className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/4"
                onClick={() => setSelectedMonthIndex(index)}
              >
                <div
                  className={cn(
                    "cursor-pointer p-4 rounded-2xl border transition-all h-full flex flex-col justify-between",
                    selectedMonthIndex === index
                      ? "bg-[#0126fb] border-white shadow-[0_0_15px_rgba(1,38,251,0.5)]"
                      : "bg-black/20 border-white/5 hover:border-white/20"
                  )}
                >
                  <div>
                    <p
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mb-1",
                        selectedMonthIndex === index
                          ? "text-blue-200"
                          : "text-gray-500"
                      )}
                    >
                      {monthsLabel[item.month - 1]}
                    </p>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {item.value.name}
                    </h3>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-white/60">
                      {item.recognitions.length} reconhecimentos
                    </span>
                    {selectedMonthIndex === index && (
                      <Star
                        size={14}
                        className="text-[#f5b719] fill-[#f5b719]"
                      />
                    )}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="hidden md:block">
            <CarouselPrevious className="-left-4 bg-[#010d26] border-gray-700 text-white" />
            <CarouselNext className="-right-4 bg-[#010d26] border-gray-700" />
          </div>
        </Carousel>
      </section>

      {/* --- SEÇÃO 2: RECONHECIMENTOS DA CASINHA DO VALOR ATUAL --- */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#f5b719] mb-1">
              <Star size={16} className="fill-[#f5b719]" />
              <span className="text-xs font-bold uppercase tracking-tighter">
                Valor do Mês
              </span>
            </div>
            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">
              {activeMonthData?.value.name}
            </h2>
            <p className="text-gray-400 max-w-xl mt-2 text-sm">
              &quot;{activeMonthData?.value.description}&quot;
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* BOTÃO PARA ATRIBUIR RECONHECIMENTO (O que você pediu) */}
            {isDirector && activeMonthData && (
              <AssignRecognitionModal
                scheduleId={activeMonthData.id}
                authorId={user!.id}
              />
            )}

            <div className="flex items-center gap-2 bg-[#0126fb]/20 px-4 py-2 rounded-full border border-[#0126fb]/30">
              <Medal size={18} className="text-[#f5b719]" />
              <span className="text-sm font-semibold text-white">
                Reconhecimentos de Casinha
              </span>
            </div>
          </div>
        </div>

        {activeMonthData?.recognitions &&
        activeMonthData.recognitions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeMonthData.recognitions.map((rec: any) => (
              <div key={rec.id} className="flex flex-col gap-4">
                {/* Pode haver múltiplos vencedores em um único reconhecimento */}
                {rec.winners.map((winner: any) => (
                  <CasinhaWinnerCard
                    key={winner.id}
                    winner={winner}
                    authorName={rec.author?.name}
                    isDirector={isDirector}
                    onDelete={() => setItemToDelete(rec.id)}
                    title={rec.recognitionModel.title}
                    date={rec.date}
                    imageUrl={rec.media?.[0]?.url} // Pega a primeira foto tirada
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-black/10">
            <Trophy size={48} className="text-gray-700 mb-4" />
            <p className="text-gray-500 font-medium">
              Nenhum reconhecimento registrado para este valor ainda.
            </p>
          </div>
        )}
      </section>

      {isDirector && (
        <section className="pt-10 border-t border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Settings className="text-gray-500" />
              <h2 className="text-xl font-bold text-white">
                Configurações de Reconhecimento
              </h2>
            </div>
            <CreateModelModal />
          </div>

          <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
            <p className="text-sm text-gray-400">
              Gerencie aqui os tipos de Reconhecimento que podem ser atribuídos
              (ex: Casinha, Prêmio Cultural...). Edições aqui não afetam
              reconhecimentos já entregues.
            </p>

            <ManageModelsList models={allModels || []} />
          </div>
        </section>
      )}

      {/* --- SEÇÃO 3: OUTROS RECONHECIMENTOS --- */}
      <section className="pt-10 border-t border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            Outras Conquistas <Medal className="text-gray-500" />
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-3xl border border-white/5 flex items-center justify-between group cursor-not-allowed">
            <div>
              <h3 className="text-xl font-bold text-gray-400">
                AGO & Guinness
              </h3>
              <p className="text-sm text-gray-600">
                Reconhecimentos anuais e recordes internos.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-full group-hover:bg-white/10 transition-colors">
              <ArrowRight className="text-gray-700" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-3xl border border-white/5 flex items-center justify-between group cursor-not-allowed">
            <div>
              <h3 className="text-xl font-bold text-gray-400">
                Destaques de Projetos
              </h3>
              <p className="text-sm text-gray-600">
                Excelência técnica e entrega de valor ao cliente.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-full group-hover:bg-white/10 transition-colors">
              <ArrowRight className="text-gray-700" />
            </div>
          </div>
        </div>
      </section>
      {itemToDelete && (
        <ModalConfirm
          title="Confirmar Exclusão"
          onConfirm={() => deleteCasinhaRecognition(itemToDelete!)}
          isLoading={isDeleting}
          onCancel={() => setItemToDelete(null)}
          open={!!itemToDelete}
        />
      )}
    </div>
  );
};

export default RecognitionsContent;
