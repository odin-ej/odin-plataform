"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, DollarSign, Database, Bot, AlertCircle } from "lucide-react";
import KrakenVisualization from "../KrakenVisualization";

interface KrakenMetrics {
  requestsToday: number;
  costToday: number;
  cacheHitRate: number;
  activeAgents: number;
  totalMessagesToday?: number;
  totalCostToday?: number;
}

interface KrakenAgent {
  id: string;
  displayName: string;
  category: string;
  model: string;
  color: string;
  iconUrl?: string | null;
  isActive: boolean;
}

async function fetchMetrics(): Promise<KrakenMetrics> {
  const res = await fetch("/api/kraken/metrics");
  if (!res.ok) throw new Error("Falha ao carregar métricas");
  return res.json();
}

async function fetchAgents(): Promise<KrakenAgent[]> {
  const res = await fetch("/api/kraken/agents");
  if (!res.ok) throw new Error("Falha ao carregar agentes");
  return res.json();
}

export default function KrakenOverviewTab() {
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useQuery({
    queryKey: ["kraken-metrics"],
    queryFn: fetchMetrics,
  });

  const {
    data: agents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useQuery({
    queryKey: ["kraken-agents"],
    queryFn: fetchAgents,
  });

  const error = metricsError || agentsError;

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        <AlertCircle className="h-5 w-5" />
        <span>Erro ao carregar dados: {(error as Error).message}</span>
      </div>
    );
  }

  const statCards = [
    {
      title: "Requisições Hoje",
      value: metrics?.totalMessagesToday ?? metrics?.requestsToday ?? 0,
      icon: Activity,
      format: (v: number) => v.toLocaleString("pt-BR"),
    },
    {
      title: "Custo Hoje",
      value: metrics?.totalCostToday ?? metrics?.costToday ?? 0,
      icon: DollarSign,
      format: (v: number) =>
        v.toLocaleString("pt-BR", { style: "currency", currency: "USD" }),
    },
    {
      title: "Taxa de Cache Hit",
      value: metrics?.cacheHitRate ?? 0,
      icon: Database,
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
    },
    {
      title: "Agentes Ativos",
      value: metrics?.activeAgents ?? 0,
      icon: Bot,
      format: (v: number) => v.toString(),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <KrakenVisualization
        agents={agents ?? []}
        activeAgent={null}
        stats={{
          requestsToday: metrics?.totalMessagesToday ?? metrics?.requestsToday ?? 0,
          costToday: metrics?.totalCostToday ?? metrics?.costToday ?? 0,
        }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-4 shadow-lg"
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium text-white/70">
                {stat.title}
              </span>
              <stat.icon className="h-4 w-4 text-[#0126fb]" />
            </div>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24 bg-white/10" />
            ) : (
              <div className="text-2xl font-bold text-white">
                {stat.format(stat.value)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] shadow-lg">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold text-white">Agentes Registrados</h3>
          <p className="text-sm text-white/50">
            Visão rápida de todos os agentes do Kraken
          </p>
        </div>
        <div className="px-6 pb-6">
          {agentsLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-white/10" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {agents?.map((agent) => (
                <span
                  key={agent.id}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
                    agent.isActive
                      ? "border-[#0126fb]/30 bg-[#0126fb]/20 text-[#0126fb]"
                      : "border-white/10 bg-white/10 text-white/60"
                  }`}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-white/20"
                    style={{ backgroundColor: agent.color }}
                  />
                  {agent.displayName}
                  {!agent.isActive && (
                    <span className="text-xs opacity-60">(inativo)</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
