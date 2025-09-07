"use client";

import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";

const SyncIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 2v6h6"></path>
    <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
    <path d="M21 22v-6h-6"></path>
    <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
  </svg>
);
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const SuccessIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const FailureIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

// Componente de UI para o painel de sincronização
export const SyncOraculoPanel = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<
    "default" | "syncing" | "success" | "failure"
  >("default");
  const [lastSyncDate, setLastSyncDate] = useState<string>("Buscando...");

  // Efeito para buscar a data da última sincronização ao montar o componente
  useEffect(() => {
    const fetchLastSync = async () => {
      try {
        const { data } = await axios.get("/api/oraculo/sync/last-sync");
        if (
          data &&
          data.lastSync &&
          new Date(data.lastSync).getFullYear() > 1970
        ) {
          setLastSyncDate(
            new Date(data.lastSync).toLocaleString("pt-BR", {
              dateStyle: "full",
              timeStyle: "medium",
            })
          );
        } else {
          setLastSyncDate("Nenhuma sincronização realizada");
        }
      } catch (error) {
        console.error("Erro ao buscar última sincronização:", error);
        setLastSyncDate("Não foi possível obter a data.");
      }
    };
    fetchLastSync();
  }, []);

  const { mutate: runSync, isPending } = useMutation({
    mutationFn: () => axios.post("/api/oraculo/sync"),
    onMutate: () => {
      setStatus("syncing");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["oraculoFiles", "oraculoFolders"],
      });
      setLastSyncDate(
        new Date().toLocaleString("pt-BR", {
          dateStyle: "full",
          timeStyle: "medium",
        })
      );
      setStatus("success");
      setTimeout(() => setStatus("default"), 4000); // Volta ao padrão após 4s
    },
    onError: () => {
      setStatus("failure");
      setTimeout(() => setStatus("default"), 5000); // Volta ao padrão após 5s
    },
  });

  const statusInfo = {
    default: {
      barClass: "border-blue-500/30 bg-blue-500/10",
      textClass: "text-blue-300",
      icon: <ClockIcon className="h-5 w-5 mr-3" />,
      title: "Última sincronização",
      subtitle: lastSyncDate,
    },
    syncing: {
      barClass: "border-yellow-500/30 bg-yellow-500/10",
      textClass: "text-yellow-300 animate-pulse",
      icon: <Loader2 className="h-5 w-5 mr-3 animate-spin" />,
      title: "Sincronização em andamento...",
      subtitle: "Buscando e atualizando arquivos.",
    },
    success: {
      barClass: "border-green-500/30 bg-green-500/10",
      textClass: "text-green-300",
      icon: <SuccessIcon className="h-5 w-5 mr-3" />,
      title: "Sincronização concluída com sucesso!",
      subtitle: `Atualizado em: ${new Date().toLocaleTimeString("pt-BR")}`,
    },
    failure: {
      barClass: "border-red-500/30 bg-red-500/10",
      textClass: "text-red-300",
      icon: <FailureIcon className="h-5 w-5 mr-3" />,
      title: "Falha na sincronização.",
      subtitle: "Por favor, tente novamente.",
    },
  };

  const currentStatus = statusInfo[status];

  return (
    <div className="w-full bg-[#010d26]/80 border-2 border-[#0126fb]/30 text-white shadow-2xl backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-300">
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-grow">
            <h2 className="flex items-center gap-3 text-lg font-bold text-white">
              <SyncIcon className="h-6 w-6 text-[#0126fb]" />
              Sincronização com Google Drive
            </h2>
            <p className="text-gray-400 pt-1 text-sm max-w-2xl">
              Atualize os arquivos e pastas do Oráculo a partir da sua pasta
              configurada no Google Drive.
            </p>
          </div>

          <button
            onClick={() => runSync()}
            disabled={isPending}
            className="w-full md:w-auto bg-[#0126fb] hover:bg-[#0126fb]/80 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all font-semibold px-6 h-12 text-base flex items-center justify-center rounded-lg shadow-md"
          >
            <SyncIcon
              className={cn(
                "mr-2 h-5 w-5 transition-transform duration-500",
                isPending && "animate-spin"
              )}
            />
            <span>
              {isPending
                ? "Sincronizando..."
                : status === "failure"
                ? "Tentar Novamente"
                : "Sincronizar Agora"}
            </span>
          </button>
        </div>
      </div>

      {/* Barra de Status Dinâmica */}
      <div
        className={cn(
          "px-6 py-3 border-t-2 transition-all duration-300",
          currentStatus.barClass
        )}
      >
        <div className={cn("flex items-center", currentStatus.textClass)}>
          {currentStatus.icon}
          <div>
            <p className="font-semibold text-sm">{currentStatus.title}</p>
            <p className="text-xs -mt-1">{currentStatus.subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
