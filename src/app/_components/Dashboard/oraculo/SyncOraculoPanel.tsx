"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Componente de UI para o painel de sincronização
export const SyncOraculoPanel = () => {
  const queryClient = useQueryClient();
  const [lastSync, setLastSync] = useState<string>("Ainda não sincronizado");

 
  useEffect(() => { 
    const fetchLastSync = async () => {
      try {
        const { data } = await axios.get('/api/oraculo/sync/last-sync');
        setLastSync(new Date(data.lastSync).toLocaleString('pt-BR'));
      } catch (error) {
        console.error("Erro ao buscar última sincronização:", error);
        setLastSync("Não foi possível obter a data.");
      }
    };
    fetchLastSync();
  }, []);

  // useMutation para lidar com a chamada da API de sincronização
  const { mutate: runSync, isPending: isLoading } = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/oraculo/sync');
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Sincronização concluída!", {
        description: data.message,
        icon: <CheckCircle className="text-green-500" />,
      });
      // Invalida queries para forçar a recarga dos dados do Oráculo na UI
      queryClient.invalidateQueries({ queryKey: ['oraculoData'] });
      // Atualiza a data da última sincronização na UI
      setLastSync(new Date().toLocaleString('pt-BR'));
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || "Não foi possível conectar com o servidor.";
      toast.error("Falha na Sincronização", {
        description: errorMessage,
        icon: <AlertCircle className="text-red-500" />,
      });
      console.error("Erro na sincronização:", error);
    },
  });

  const handleSync = () => {
    toast.info("Iniciando sincronização...", {
      description: "Buscando novos arquivos e atualizações no Google Drive. Isso pode levar alguns minutos.",
    });
    runSync();
  };

  return (
    <Card className="w-full max-w-lg bg-[#010d26]/80 border-2 border-[#0126fb]/30 text-white shadow-lg backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#0126fb]">
          <RefreshCw className="h-6 w-6" />
          Sincronização com Google Drive
        </CardTitle>
        <CardDescription className="text-gray-400 pt-1">
          Clique no botão para buscar e atualizar os arquivos e pastas do Oráculo a partir da pasta configurada no Google Drive.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-sm text-gray-300 p-3 bg-[#00205e]/50 rounded-md border border-gray-700">
          <Clock className="h-4 w-4 mr-3 text-[#f5b719]" />
          <span>
            Última sincronização: <span className="font-semibold">{lastSync}</span>
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSync} 
          disabled={isLoading} 
          className="w-full bg-[#0126fb] hover:bg-[#0126fb]/80 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          {isLoading ? "Sincronizando..." : "Sincronizar Agora"}
        </Button>
      </CardFooter>
    </Card>
  );
};
