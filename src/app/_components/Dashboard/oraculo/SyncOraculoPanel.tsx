"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { Loader2 } from "lucide-react";
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

type SyncStatus = "default" | "checking" | "syncing" | "success" | "failure";
interface FileToProcess {
  id: string;
  name: string;
}

// Componente de UI para o painel de sincronização
export const SyncOraculoPanel = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SyncStatus>("default");
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
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorDetails, setErrorDetails] = useState<string>("");

  const { mutate: runSync, isPending } = useMutation({
    mutationFn: async () => {
      // Etapa 1: Verificar arquivos para sincronizar
      setStatus("checking");
      const checkResponse = await axios.post<{
        filesToProcess: FileToProcess[];
      }>("/api/oraculo/sync/check");
      const files = checkResponse.data.filesToProcess;

      if (files.length === 0) {
        // Atualiza o log para SUCCESS mesmo se nada for sincronizado
        await axios.post("/api/oraculo/sync/log-success");
        return {
          message:
            "Seu Oráculo já está atualizado. Nenhum arquivo precisou ser sincronizado.",
        };
      }

      // Etapa 2: Processar cada arquivo individualmente
      setStatus("syncing");
      setProgress({ current: 0, total: files.length });
      let successCount = 0;
      let firstError: string | null = null;

      for (const file of files) {
        try {
          await axios.post("/api/oraculo/sync/process-file", {
            fileId: file.id,
          });
          successCount++;
        } catch (error) {
          const axiosError = error as AxiosError<{ message: string }>;
          console.error(
            `Falha ao processar o arquivo ${file.name}:`,
            axiosError.response?.data?.message || axiosError.message
          );
          if (!firstError) {
            firstError = `Falha no arquivo "${file.name}". Verifique as permissões no Google Drive.`;
          }
        }
        setProgress((prev) => ({ ...prev, current: prev.current + 1 }));
      }

      // Etapa 3: Finalizar o log
      if (firstError) {
        await axios.post("/api/oraculo/sync/log-failure", {
          details: firstError,
        });
        throw new Error(firstError);
      }

      await axios.post("/api/oraculo/sync/log-success");
      return {
        message: `${successCount} de ${files.length} arquivos foram sincronizados com sucesso!`,
      };
    },
    onSuccess: () => {
      setStatus("success");
      queryClient.invalidateQueries({
        queryKey: ["oraculoFiles", "oraculoFolders", "oraculoData"],
      });
      setLastSyncDate(
        new Date().toLocaleString("pt-BR", {
          dateStyle: "full",
          timeStyle: "medium",
        })
      );
      setTimeout(() => setStatus("default"), 4000);
    },
    onError: (error) => {
      setErrorDetails((error as Error).message);
      setStatus("failure");
      setTimeout(() => setStatus("default"), 8000);
    },
  });

  const statusInfo = {
    default: {
      bar: "border-blue-500/30 bg-blue-500/10",
      text: "text-blue-300",
      icon: <ClockIcon className="h-5 w-5 mr-3" />,
      title: "Última sincronização",
      subtitle: lastSyncDate,
    },
    checking: {
      bar: "border-yellow-500/30 bg-yellow-500/10",
      text: "text-yellow-300",
      icon: <Loader2 className="h-5 w-5 mr-3 shrink-0 animate-spin" />,
      title: "Verificando arquivos...",
      subtitle: "Comparando com o Google Drive.",
    },
    syncing: {
      bar: "border-yellow-500/30 bg-yellow-500/10",
      text: "text-yellow-300 animate-pulse",
      icon: <Loader2 className="h-5 w-5 mr-3 animate-spin" />,
      title: "Sincronização em andamento...",
      subtitle: "Buscando e atualizando arquivos.",
    },
    success: {
      bar: "border-green-500/30 bg-green-500/10",
      text: "text-green-300",
      icon: <SuccessIcon className="h-5 w-5 mr-3" />,
      title: "Sincronização concluída com sucesso!",
      subtitle: `Atualizado em: ${new Date().toLocaleTimeString("pt-BR")}`,
    },
    failure: {
      bar: "border-red-500/30 bg-red-500/10",
      text: "text-red-300",
      icon: <FailureIcon className="h-5 w-5 mr-3" />,
      title: "Falha na sincronização.",
      subtitle: errorDetails,
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
              Mantenha os arquivos do Oráculo atualizados com a sua pasta
              configurada no Google Drive.
            </p>
          </div>
          <Button
            onClick={() => runSync()}
            disabled={isPending}
            className="w-full cursor-pointer md:w-auto bg-[#0126fb] hover:bg-[#0126fb]/80 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all font-semibold px-6 h-12 text-base flex items-center justify-center rounded-lg shadow-md"
          >
            <SyncIcon
              className={cn(
                "mr-2 h-5 w-5 transition-transform duration-500",
                isPending && "animate-spin"
              )}
            />
            <span>
              {isPending
                ? "Em Andamento..."
                : status === "failure"
                ? "Tentar Novamente"
                : "Sincronizar Agora"}
            </span>
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "px-6 py-3 border-t-2 transition-all duration-300 relative",
          currentStatus.bar
        )}
      >
        {status === "syncing" && (
          <div
            className="absolute top-0 left-0 h-full bg-yellow-400/20"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          ></div>
        )}
        <div className={cn("flex items-center relative", currentStatus.text)}>
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
